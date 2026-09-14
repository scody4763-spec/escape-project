function utf8Bytes(str) {
  var bytes = []
  for (var i = 0; i < str.length; i++) {
    var code = str.charCodeAt(i)
    if (code < 0x80) {
      bytes.push(code)
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    }
  }
  return bytes
}

function encodeLength(len) {
  var out = []
  do {
    var b = len % 128
    len = Math.floor(len / 128)
    if (len > 0) b |= 0x80
    out.push(b)
  } while (len > 0)
  return out
}

function buildConnect(options) {
  var body = [0, 4].concat(utf8Bytes('MQTT'))
  body.push(4)

  var flags = 0x02
  if (options.username) flags |= 0x80
  if (options.password) flags |= 0x40
  body.push(flags)

  var keep = options.keepalive || 30
  body.push(keep >> 8, keep & 0xff)

  var cid = utf8Bytes(options.clientId || 'wxmqtt_' + Math.random().toString(16).slice(2))
  body.push(cid.length >> 8, cid.length & 0xff)
  body = body.concat(cid)

  if (options.username) {
    var ub = utf8Bytes(options.username)
    body.push(ub.length >> 8, ub.length & 0xff)
    body = body.concat(ub)
  }
  if (options.password) {
    var pb = utf8Bytes(options.password)
    body.push(pb.length >> 8, pb.length & 0xff)
    body = body.concat(pb)
  }

  return [0x10].concat(encodeLength(body.length)).concat(body)
}

function buildSubscribe(topic, packetId) {
  var body = [packetId >> 8, packetId & 0xff]
  var tb = utf8Bytes(topic)
  body.push(tb.length >> 8, tb.length & 0xff)
  body = body.concat(tb)
  body.push(0x00)
  return [0x82].concat(encodeLength(body.length)).concat(body)
}

function buildPublish(topic, payload) {
  var body = []
  var tb = utf8Bytes(topic)
  body.push(tb.length >> 8, tb.length & 0xff)
  body = body.concat(tb)
  body = body.concat(utf8Bytes(String(payload)))
  return [0x30].concat(encodeLength(body.length)).concat(body)
}

function createMqttClient(options) {
  var client = {
    url: options.url,
    username: options.username || '',
    password: options.password || '',
    clientId: options.clientId || 'wxmqtt_' + Math.random().toString(16).slice(2),
    keepalive: options.keepalive || 30,
    onConnect: options.onConnect || function () {},
    onMessage: options.onMessage || function () {},
    onError: options.onError || function () {},
    onClose: options.onClose || function () {},
    socketTask: null,
    buffer: [],
    connected: false,
    packetId: 1,
    keepTimer: null,

    send: function (bytes) {
      if (!this.socketTask) return
      var u8 = new Uint8Array(bytes)
      this.socketTask.send({
        data: u8.buffer,
        success: function () {},
        fail: function (err) {
          this.onError(err)
        }.bind(this)
      })
    },

    connect: function () {
      var self = this
      // 构建备选URL列表：如果wss://失败，尝试ws://
      var urls = [this.url]
      if (this.url.indexOf('wss://') === 0) {
        urls.push('ws://' + this.url.slice(6))
      }
      this._connectTry(urls, 0)
    },

    _connectTry: function (urls, index) {
      if (index >= urls.length) {
        console.error('wxmqtt 所有连接方式均失败')
        this.onError({ errMsg: '所有连接方式均失败' })
        return
      }
      var self = this
      var url = urls[index]
      console.log('wxmqtt 尝试连接 [' + (index + 1) + '/' + urls.length + ']: ' + url)

      this.socketTask = wx.connectSocket({
        url: url,
        protocols: ['mqtt'],
        enableCompression: false,
        success: function () {},
        fail: function (err) {
          console.error('wxmqtt connectSocket fail [' + url + ']', err)
          self._connectTry(urls, index + 1)
        }
      })
      this.socketTask.onOpen(function () {
        console.log('wxmqtt socket open [' + url + ']')
        self.url = url
        self.send(buildConnect({
          clientId: self.clientId,
          username: self.username,
          password: self.password,
          keepalive: self.keepalive
        }))
      })
      this.socketTask.onMessage(function (res) {
        var data = res.data
        var bytes
        if (typeof data === 'string') {
          bytes = utf8Bytes(data)
        } else {
          bytes = Array.prototype.slice.call(new Uint8Array(data))
        }
        self.buffer = self.buffer.concat(bytes)
        self.parse()
      })
      this.socketTask.onClose(function () {
        self.connected = false
        if (self.keepTimer) clearInterval(self.keepTimer)
        self.onClose()
      })
      this.socketTask.onError(function (err) {
        console.error('wxmqtt socket error [' + url + ']', err)
        if (!self.connected) {
          self._connectTry(urls, index + 1)
        }
      })
    },

    parse: function () {
      while (this.buffer.length >= 2) {
        var first = this.buffer[0]
        var remainingLen = 0
        var multiplier = 1
        var idx = 1
        var lenBytes = 0
        var digit
        do {
          if (idx >= this.buffer.length) return
          digit = this.buffer[idx]
          remainingLen += (digit & 0x7f) * multiplier
          multiplier *= 128
          idx++
          lenBytes++
        } while ((digit & 0x80) !== 0 && lenBytes < 4)

        var total = 1 + lenBytes + remainingLen
        if (this.buffer.length < total) return
        var packet = this.buffer.slice(0, total)
        this.buffer = this.buffer.slice(total)
        this.handlePacket(first, packet, 1 + lenBytes)
      }
    },

    handlePacket: function (first, packet, bodyStart) {
      var type = first >> 4
      if (type === 2) {
        var code = packet.length > bodyStart + 1 ? packet[bodyStart + 1] : -1
        if (code === 0) {
          this.connected = true
          var self = this
          this.keepTimer = setInterval(function () {
            self.send([0xc0, 0x00])
          }, Math.max(10000, Math.floor(this.keepalive * 1000 / 2)))
          this.onConnect()
        } else {
          this.onError({ errMsg: 'MQTT CONNACK code=' + code })
        }
      } else if (type === 3) {
        var idx = bodyStart
        var topicLen = (packet[idx] << 8) | packet[idx + 1]
        idx += 2
        var topicBytes = packet.slice(idx, idx + topicLen)
        idx += topicLen
        var qos = (first >> 1) & 0x03
        if (qos > 0) idx += 2
        var payloadBytes = packet.slice(idx)
        this.onMessage(this.decode(topicBytes), this.decode(payloadBytes))
      }
    },

    decode: function (bytes) {
      var out = ''
      for (var i = 0; i < bytes.length; i++) {
        out += String.fromCharCode(bytes[i])
      }
      return out
    },

    subscribe: function (topic) {
      if (!this.connected) return
      this.send(buildSubscribe(topic, this.packetId++))
    },

    publish: function (topic, payload) {
      if (!this.connected) return
      this.send(buildPublish(topic, payload))
    },

    end: function () {
      if (this.keepTimer) clearInterval(this.keepTimer)
      if (this.socketTask) {
        try {
          this.socketTask.close()
        } catch (e) {}
      }
      this.connected = false
      this.socketTask = null
    }
  }
  return client
}

module.exports = createMqttClient
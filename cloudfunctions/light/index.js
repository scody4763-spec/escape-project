// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: "echo001-6gvky949c856ba41",
  traceUser: "true"
})

// 引入mysql操作模块
const mysql = require('mysql2/promise')

// 云函数入口函数
exports.main = async (event, context) => {

  //链接mysql数据库的test库，这里你可以链接你mysql中的任意库
  try {
    const connection = await mysql.createConnection({
      host: "124.220.31.151",
      database: "gkdgr",
      user: "root",
      password: "123456"
    })

    // event.sql为传入的SQL语句，可以用SELECT version();来测试，注意要用引号引起来

    //const [rows, fields] = await connection.execute("SELECT * from QRSDate")
    // const [rows, fields] = await connection.execute("select * from (select * from QRSDate order by id desc limit 40) a order by id")
    
    let sql='UPDATE Light SET LD = '+event.ld
    const [rows, fields] = await connection.execute(sql)
    connection.end(function (err) {});

    return rows
  } catch (err) {
    return err
  }


}
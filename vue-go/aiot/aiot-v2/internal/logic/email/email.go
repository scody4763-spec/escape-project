package email

import (
	"aiot/internal/logic/notification"
	"aiot/internal/model/entity"
	"context"
	"crypto/tls"
	"fmt"
	"net/smtp"
	"strings"

	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
)

// Send sends an HTML email using net/smtp with TLS.
func Send(ctx context.Context, to, subject, body string) error {
	host := g.Cfg().MustGet(ctx, "mail.host").String()
	port := g.Cfg().MustGet(ctx, "mail.port").Int()
	username := g.Cfg().MustGet(ctx, "mail.username").String()
	password := g.Cfg().MustGet(ctx, "mail.password").String()
	from := g.Cfg().MustGet(ctx, "mail.from").String()
	fromName := g.Cfg().MustGet(ctx, "mail.fromName").String()

	addr := fmt.Sprintf("%s:%d", host, port)

	// Build MIME message
	msg := buildMIME(from, fromName, to, subject, body)

	tlsConfig := &tls.Config{
		InsecureSkipVerify: false,
		ServerName:         host,
	}

	// Connect via TLS
	conn, err := tls.Dial("tcp", addr, tlsConfig)
	if err != nil {
		return fmt.Errorf("tls dial: %w", err)
	}

	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return fmt.Errorf("smtp client: %w", err)
	}
	defer client.Close()

	auth := smtp.PlainAuth("", username, password, host)
	if err = client.Auth(auth); err != nil {
		return fmt.Errorf("smtp auth: %w", err)
	}

	if err = client.Mail(from); err != nil {
		return err
	}
	if err = client.Rcpt(to); err != nil {
		return err
	}

	w, err := client.Data()
	if err != nil {
		return err
	}
	_, err = w.Write([]byte(msg))
	if err != nil {
		return err
	}
	return w.Close()
}

func buildMIME(from, fromName, to, subject, body string) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("From: %s <%s>\r\n", fromName, from))
	sb.WriteString(fmt.Sprintf("To: %s\r\n", to))
	sb.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	sb.WriteString("MIME-Version: 1.0\r\n")
	sb.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	sb.WriteString("\r\n")
	sb.WriteString(body)
	return sb.String()
}

// SendAlert sends a fire/electricity alert email to all configured recipients and records mysql logs.
func SendAlert(ctx context.Context, alertId int64, location, eventDesc string) {
	recipients := g.Cfg().MustGet(ctx, "mail.recipients").Strings()
	from := g.Cfg().MustGet(ctx, "mail.from").String()
	subject := "【AIoT报警】" + eventDesc
	body := "<h3>AIoT 智能逃生系统告警</h3>" +
		"<p><b>地点：</b>" + location + "</p>" +
		"<p><b>事件：</b>" + eventDesc + "</p>" +
		"<p>请立即检查现场并处理！</p>"

	for _, to := range recipients {
		log := &entity.NotificationLog{
			AlertId:   alertId,
			Location:  location,
			EventDesc: eventDesc,
			FromEmail: from,
			ToEmail:   to,
			SendTime:  gtime.Now(),
		}
		if err := Send(ctx, to, subject, body); err != nil {
			log.SendStatus = 2
			log.FailReason = err.Error()
			if _, createErr := notification.Create(ctx, log); createErr != nil {
				g.Log().Warningf(ctx, "create notification log failed: %v", createErr)
			}
			g.Log().Warningf(ctx, "send alert email to %s failed: %v", to, err)
			continue
		}
		log.SendStatus = 1
		if _, createErr := notification.Create(ctx, log); createErr != nil {
			g.Log().Warningf(ctx, "create notification log failed: %v", createErr)
		}
	}
}

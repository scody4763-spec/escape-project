package middleware

import (
	"net/http"
	"strings"

	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/net/ghttp"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	AdminId  int64 `json:"adminId"`
	Identity int   `json:"identity"`
	jwt.RegisteredClaims
}

// Auth is the JWT Bearer authentication middleware.
func Auth(r *ghttp.Request) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		r.Response.WriteJsonExit(g.Map{
			"code":    http.StatusUnauthorized,
			"message": "missing or invalid authorization header",
		})
		return
	}

	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
	secret := g.Cfg().MustGet(r.Context(), "jwt.secret").String()

	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(secret), nil
	})

	if err != nil || !token.Valid {
		r.Response.WriteJsonExit(g.Map{
			"code":    http.StatusUnauthorized,
			"message": "invalid or expired token",
		})
		return
	}

	claims, ok := token.Claims.(*Claims)
	if !ok {
		r.Response.WriteJsonExit(g.Map{
			"code":    http.StatusUnauthorized,
			"message": "invalid token claims",
		})
		return
	}

	// Inject claims into request context vars
	r.SetCtxVar("adminId", claims.AdminId)
	r.SetCtxVar("identity", claims.Identity)

	r.Middleware.Next()
}

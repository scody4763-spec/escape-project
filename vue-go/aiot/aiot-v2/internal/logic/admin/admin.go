package admin

import (
	"aiot/internal/dao"
	"aiot/internal/model/do"
	"aiot/internal/model/entity"
	"context"
	"errors"
	"time"

	"github.com/gogf/gf/v2/frame/g"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type Claims struct {
	AdminId  int64 `json:"adminId"`
	Identity int   `json:"identity"`
	jwt.RegisteredClaims
}

// Login authenticates an admin and returns a JWT token.
func Login(ctx context.Context, account, password string) (token string, admin *entity.Admin, err error) {
	admin, err = dao.Admin.GetByAccount(ctx, account)
	if err != nil || admin == nil {
		return "", nil, errors.New("account or password incorrect")
	}

	if err = bcrypt.CompareHashAndPassword([]byte(admin.Password), []byte(password)); err != nil {
		return "", nil, errors.New("account or password incorrect")
	}

	secret := g.Cfg().MustGet(ctx, "jwt.secret").String()
	claims := Claims{
		AdminId:  admin.Id,
		Identity: admin.Identity,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	token, err = t.SignedString([]byte(secret))
	return token, admin, err
}

// List returns all admins.
func List(ctx context.Context) (list []*entity.Admin, err error) {
	err = dao.Admin.Ctx(ctx).Where("delete_state", 0).Scan(&list)
	return
}

// GetById returns an admin by ID.
func GetById(ctx context.Context, id int64) (out *entity.Admin, err error) {
	return dao.Admin.GetByIdWithCache(ctx, id)
}

// Create creates a new admin with hashed password.
func Create(ctx context.Context, req *entity.Admin) (id int64, err error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return 0, err
	}
	result, err := dao.Admin.Ctx(ctx).Data(&do.Admin{
		UserAccount: req.UserAccount,
		Password:    string(hashed),
		Name:        req.Name,
		Phone:       req.Phone,
		Email:       req.Email,
		Identity:    req.Identity,
		DeleteState: 0,
	}).Insert()
	if err != nil {
		return 0, err
	}
	id, _ = result.LastInsertId()
	return id, nil
}

// Update updates an admin's info.
func Update(ctx context.Context, id int64, req *entity.Admin) error {
	data := do.Admin{
		Name:      req.Name,
		Phone:     req.Phone,
		Email:     req.Email,
		Identity:  req.Identity,
		AvatarUrl: req.AvatarUrl,
	}
	if req.Password != "" {
		hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		data.Password = string(hashed)
	}
	_, err := dao.Admin.Ctx(ctx).WherePri(id).Data(data).Update()
	if err == nil {
		dao.Admin.InvalidateCache(ctx, id)
	}
	return err
}

// Delete soft-deletes an admin.
func Delete(ctx context.Context, id int64) error {
	_, err := dao.Admin.Ctx(ctx).WherePri(id).Data(do.Admin{DeleteState: 1}).Update()
	if err == nil {
		dao.Admin.InvalidateCache(ctx, id)
	}
	return err
}

package admin

import (
	v1 "aiot/api/admin/v1"
	"aiot/internal/errs"
	"aiot/internal/logic/admin"
	"aiot/internal/model/entity"
	"context"
)

// PublicV1 handles public endpoints (no auth required).
type PublicV1 struct{}

func NewPublicV1() *PublicV1 { return &PublicV1{} }

func (c *PublicV1) Login(ctx context.Context, req *v1.LoginReq) (res *v1.LoginRes, err error) {
	token, a, err := admin.Login(ctx, req.UserAccount, req.Password)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "登录失败，请检查账号或密码")
	}
	return &v1.LoginRes{
		Token:    token,
		AdminId:  a.Id,
		Identity: a.Identity,
	}, nil
}

// ControllerV1 handles auth-protected admin CRUD.
type ControllerV1 struct{}

func NewV1() *ControllerV1 { return &ControllerV1{} }

func (c *ControllerV1) ListAdmin(ctx context.Context, req *v1.ListAdminReq) (res *v1.ListAdminRes, err error) {
	list, err := admin.List(ctx)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "获取管理员列表失败")
	}
	return &v1.ListAdminRes{List: list, Total: len(list)}, nil
}

func (c *ControllerV1) GetAdmin(ctx context.Context, req *v1.GetAdminReq) (res *v1.GetAdminRes, err error) {
	info, err := admin.GetById(ctx, req.Id)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "获取管理员信息失败")
	}
	return &v1.GetAdminRes{Info: info}, nil
}

func (c *ControllerV1) CreateAdmin(ctx context.Context, req *v1.CreateAdminReq) (res *v1.CreateAdminRes, err error) {
	id, err := admin.Create(ctx, &entity.Admin{
		UserAccount: req.UserAccount,
		Password:    req.Password,
		Name:        req.Name,
		Phone:       req.Phone,
		Email:       req.Email,
		Identity:    req.Identity,
	})
	if err != nil {
		return nil, errs.Wrap(ctx, err, "创建管理员失败")
	}
	return &v1.CreateAdminRes{Id: id}, nil
}

func (c *ControllerV1) UpdateAdmin(ctx context.Context, req *v1.UpdateAdminReq) (res *v1.UpdateAdminRes, err error) {
	err = admin.Update(ctx, req.Id, &entity.Admin{
		Name:      req.Name,
		Phone:     req.Phone,
		Email:     req.Email,
		Password:  req.Password,
		AvatarUrl: req.AvatarUrl,
		Identity:  req.Identity,
	})
	if err != nil {
		return nil, errs.Wrap(ctx, err, "更新管理员信息失败")
	}
	return &v1.UpdateAdminRes{}, nil
}

func (c *ControllerV1) DeleteAdmin(ctx context.Context, req *v1.DeleteAdminReq) (res *v1.DeleteAdminRes, err error) {
	if err = admin.Delete(ctx, req.Id); err != nil {
		return nil, errs.Wrap(ctx, err, "删除管理员失败")
	}
	return &v1.DeleteAdminRes{}, nil
}

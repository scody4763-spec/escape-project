package errs

import (
	"context"

	"github.com/gogf/gf/v2/errors/gcode"
	"github.com/gogf/gf/v2/errors/gerror"
	"github.com/gogf/gf/v2/frame/g"
)

// Wrap logs the original error and returns a user-friendly error for the frontend.
// The friendlyMsg is what the end user will see; the real error is only logged server-side.
func Wrap(ctx context.Context, err error, friendlyMsg string) error {
	if err == nil {
		return nil
	}
	g.Log().Errorf(ctx, "%s: %+v", friendlyMsg, err)
	return gerror.NewCode(gcode.CodeInternalError, friendlyMsg)
}

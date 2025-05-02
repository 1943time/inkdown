import { createStyles } from 'antd-style'

export const useStyles = createStyles(({ css, token, cx, prefixCls }) => {
  const prefix = `${prefixCls}-highlighter`
  return {
    shiki: cx(
      `${prefix}-shiki`,
      css`
        direction: ltr;
        margin: 0;
        padding: 0;
        text-align: start;

        .shiki {
          overflow-x: auto;
          margin: 0;
          padding: 12px 16px;
          /* background: none !important; */

          code {
            display: block;

            .line {
              display: inline-block;

              width: calc(100% + 32px);
              margin-block: 0;
              margin-inline: -16px;
              padding-block: 0;
              padding-inline: 16px;
            }
          }

          &.has-focused {
            .line:not(.focused) {
              opacity: 0.5;
            }
          }

          .highlighted {
            background: ${token.colorFillTertiary};

            &.warning {
              background: ${token.colorWarningBg};
            }

            &.error {
              background: ${token.colorErrorBg};
            }
          }

          .highlighted-word {
            padding-block: 0.1em;
            padding-inline: 0.2em;
            border: 1px solid ${token.colorBorderSecondary};
            border-radius: ${token.borderRadius}px;

            background: ${token.colorFillTertiary};
          }

          .diff {
            &.remove {
              background: ${token.colorErrorBg};

              &::before {
                content: '-';

                position: absolute;
                inset-inline-start: 4px;

                display: inline-block;

                color: ${token.colorErrorText};
              }
            }

            &.add {
              background: ${token.colorSuccessBg};

              &::before {
                content: '+';

                position: absolute;
                inset-inline-start: 4px;

                display: inline-block;

                color: ${token.colorSuccessText};
              }
            }
          }
        }
      `
    )
  }
})

import * as React from "react"
import { SVGProps } from "react"

const SvgComponent = (props: SVGProps<SVGSVGElement>) => (
  <svg
    className="icon"
    viewBox="0 0 1024 1024"
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    {...props}
  >
    <path
      d="m572.16 512 183.467-183.04a42.667 42.667 0 1 0-60.587-60.587L512 451.84 328.96 268.373a42.667 42.667 0 0 0-60.587 60.587L451.84 512 268.373 695.04a42.667 42.667 0 0 0 0 60.587 42.667 42.667 0 0 0 60.587 0L512 572.16l183.04 183.467a42.667 42.667 0 0 0 60.587 0 42.667 42.667 0 0 0 0-60.587z"
      fill="currentColor"
    />
  </svg>
)

export default SvgComponent

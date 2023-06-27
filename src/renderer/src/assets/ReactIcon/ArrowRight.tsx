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
      d="M757.793 435.407 419.597 96.905c-40.01-40.01-104.886-40.01-144.896 0-40.01 40.01-40.01 104.989 0 145l265.644 265.95-265.644 265.952c-40.01 40.113-40.01 104.989 0 145 40.01 40.01 104.886 40.01 144.896 0l338.093-338.4c40.113-40.01 40.113-104.99.103-145z"
      fill="currentColor"
    />
  </svg>
)

export default SvgComponent

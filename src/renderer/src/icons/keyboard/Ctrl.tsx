import * as React from "react"
import { SVGProps } from "react"
const SvgComponent = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" {...props}>
    <path
      fill="currentColor"
      d="M11.5 7a.5.5 0 0 1-.377-.171l-3.124-3.57-3.124 3.57a.5.5 0 1 1-.753-.659l3.5-4a.502.502 0 0 1 .752 0l3.5 4a.5.5 0 0 1-.376.83z"
    />
  </svg>
)
export default SvgComponent

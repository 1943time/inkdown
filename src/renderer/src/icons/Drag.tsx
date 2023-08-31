import * as React from "react"
import { SVGProps } from "react"
const SvgComponent = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={200}
    height={200}
    className="icon"
    viewBox="0 0 1024 1024"
    {...props}
  >
    <path
      fill={'currentColor'}
      d="M653.166 136.119a77.093 77.093 0 1 1 0 154.258 77.093 77.093 0 0 1 0-154.258zm0 298.788a77.093 77.093 0 1 1 0 154.186 77.093 77.093 0 0 1 0-154.186zM437.614 772.242a77.093 77.093 0 1 0-73.655 115.347l6.875.292 6.803-.292a77.093 77.093 0 0 0 59.977-115.347zm282.331 0a77.093 77.093 0 1 0-73.582 115.347l6.803.292 6.875-.292a77.093 77.093 0 0 0 59.977-115.347zM447.854 512a77.093 77.093 0 1 0-154.112 0 77.093 77.093 0 0 0 154.185 0zm0-298.789a77.093 77.093 0 1 0-154.112 0 77.093 77.093 0 0 0 154.185 0z"
    />
  </svg>
)
export default SvgComponent

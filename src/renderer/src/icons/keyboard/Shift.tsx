import * as React from "react"
import { SVGProps } from "react"
const SvgComponent = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={48}
    height={48}
    viewBox="0 -960 960 960"
    fill={'currentColor'}
    {...props}
  >
    <path d="M320-120v-310H120l360-450 360 450H640v310H320Zm60-60h200v-310h133L480-786 247-490h133v310Zm100-310Z" />
  </svg>
)
export default SvgComponent

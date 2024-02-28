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
    <path d="M359-240 120-479l239-239 43 43-167 167h545v-172h60v231H236l166 166-43 43Z" />
  </svg>
)
export default SvgComponent

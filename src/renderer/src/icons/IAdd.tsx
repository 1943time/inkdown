import * as React from "react"
import { SVGProps } from "react"
const SvgComponent = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    className="icon"
    viewBox="0 0 1024 1024"
    fill={'currentColor'}
    {...props}
  >
    <path d="M960.083 512.001c0 21.998-17.834 39.829-39.832 39.829H103.745c-21.998 0-39.829-17.831-39.829-39.829s17.831-39.829 39.829-39.829h816.506c21.999.001 39.832 17.832 39.832 39.829z" />
    <path d="M512 63.915c21.995 0 39.829 17.834 39.829 39.835v816.503c0 22.001-17.834 39.832-39.829 39.832-21.998 0-39.832-17.831-39.832-39.832V103.75c0-22.001 17.834-39.835 39.832-39.835z" />
  </svg>
)
export default SvgComponent

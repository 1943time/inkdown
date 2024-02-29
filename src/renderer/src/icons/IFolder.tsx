import * as React from "react"
import { SVGProps } from "react"

const SvgComponent = (props: SVGProps<SVGSVGElement>) => (
  <svg
    className="icon"
    viewBox="0 0 1024 1024"
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    fill={'currentColor'}
    {...props}
  >
    <path d="M453.315 146.286a73.143 73.143 0 0 1 71.412 57.295l3.535 15.848h300.69a73.143 73.143 0 0 1 73.143 73.142v512a73.143 73.143 0 0 1-73.143 73.143H195.048a73.143 73.143 0 0 1-73.143-73.143V219.43a73.143 73.143 0 0 1 73.143-73.143h258.267zm0 73.143H195.048V804.57h633.904V414.476H496.69L453.315 219.43zM780.19 658.286v73.143H243.81v-73.143h536.38zm48.762-365.715H544.5l10.85 48.762h273.602v-48.762z" />
  </svg>
)

export default SvgComponent

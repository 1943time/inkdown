export const getOffsetTop = (dom: HTMLElement, target: HTMLElement = document.body) => {
  let top = 0
  while (target.contains(dom.offsetParent) && target !== dom) {
    top += dom.offsetTop
    dom = dom.offsetParent as HTMLElement
  }
  return top
}

export const getOffsetLeft = (dom: HTMLElement, target: HTMLElement = document.body) => {
  let left = 0
  while (target.contains(dom) && target !== dom) {
    left += dom.offsetLeft
    dom = dom.offsetParent as HTMLElement
  }
  return left
}

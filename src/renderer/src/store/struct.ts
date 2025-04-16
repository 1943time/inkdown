import { observable, runInAction, isObservable } from 'mobx'

export class StructStore<T extends object> {
  state: T
  constructor(state: T) {
    if (isObservable(state)) {
      this.state = state
    } else {
      this.state = observable(state)
    }
  }
  setState(ctx: Partial<T> | ((state: T) => void)) {
    runInAction(() => {
      if (ctx instanceof Function) {
        ctx(this.state)
      } else {
        Object.keys(ctx).forEach((key) => {
          this.state[key] = ctx[key]
        })
      }
    })
  }
}

import {Observable, Subject} from 'rxjs'
import {IObjectDidChange, IValueDidChange, observe} from 'mobx'
import {useEffect, useLayoutEffect} from 'react'

export const useObserveKey = <T extends object, K extends keyof T>(data: T, key: K, fn: (value: IValueDidChange<T[K]>) => void) => {
  useEffect(() => {
    const cancel = observe(data, key, fn)
    return () => cancel()
  }, [])
}

export const useObserve = <T extends object>(data: T, fn: (value: IObjectDidChange<T> & {newValue: any, oldValue: any}) => void) => {
  useEffect(() => {
    // @ts-ignore
    const cancel = observe(data, fn)
    return () => cancel()
  }, [])
}

export const useSubject = <T>(subject: Subject<T> | Observable<T>, fn: (value: T) => void, deps: any[] = []) => {
  useLayoutEffect(() => {
    const cancel = subject.subscribe(fn)
    return () => cancel.unsubscribe()
  }, deps)
}

import { useLayoutEffect } from 'react'
import { Observable, Subject } from 'rxjs'

export const useSubject = <T>(
  subject: Subject<T> | Observable<T>,
  fn: (value: T) => void,
  deps: any[] = []
) => {
  useLayoutEffect(() => {
    const cancel = subject.subscribe(fn)
    return () => cancel.unsubscribe()
  }, deps)
}

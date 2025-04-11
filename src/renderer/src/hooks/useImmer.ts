import { produce } from 'immer'
import { useCallback, useRef } from 'react'
import { useReducer } from 'react'

const updateReducer = (num: number): number => (num + 1) % 1_000_000
function useUpdate(): () => void {
  const [, update] = useReducer(updateReducer, 0)
  return update
}

export const useGetImmer = <T extends object>(initialState: T): [() => T, (patch: Partial<T> | ((draft: T) => void)) => void] => {
  const update = useUpdate()
  const state = useRef<T>({ ...initialState } as T)
  const get = useCallback(() => state.current, [])
  const set = useCallback((patch: Partial<T> | ((draft: T) => void)) => {
    if (patch instanceof Function) {
      state.current = produce(state.current, (draft) => {
        patch(draft as T)
      })
    } else {
      state.current = produce(state.current, (draft) => {
        return { ...draft, ...patch }
      })
    }
    update()
  }, [])
  return [get, set]
}

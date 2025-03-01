declare module 'jotai' {
  import { ReactNode } from 'react';
  
  export type Getter = <Value>(atom: Atom<Value>) => Value;
  export type Setter = <Value, Update>(atom: WritableAtom<Value, Update>, update: Update) => void;
  
  export interface Atom<Value> {
    init: Value;
  }
  
  export interface WritableAtom<Value, Update> extends Atom<Value> {
    write: (get: Getter, set: Setter, update: Update) => void;
  }
  
  export function atom<Value>(initialValue: Value): WritableAtom<Value, Value>;
  export function atom<Value, Update>(
    read: (get: Getter) => Value,
    write?: (get: Getter, set: Setter, update: Update) => void
  ): WritableAtom<Value, Update>;
  
  // React hooks
  export function useAtom<Value, Update>(
    atom: WritableAtom<Value, Update>
  ): [Value, (update: Update) => void];
  
  export function useAtomValue<Value>(atom: Atom<Value>): Value;
  
  export function useSetAtom<Value, Update>(
    atom: WritableAtom<Value, Update>
  ): (update: Update | ((prev: Value) => Update)) => void;
  
  // Provider component
  export interface ProviderProps {
    children: ReactNode;
  }
  
  export function Provider(props: ProviderProps): JSX.Element;
}

declare module 'jotai/utils' {
  import { Atom, WritableAtom } from 'jotai';
  
  export function atomWithStorage<Value>(
    key: string,
    initialValue: Value,
    storage?: {
      getItem: (key: string) => Value | null | Promise<Value | null>;
      setItem: (key: string, value: Value) => void | Promise<void>;
      removeItem: (key: string) => void | Promise<void>;
    }
  ): WritableAtom<Value, Value | ((prev: Value) => Value)>;
} 
declare module 'voko' {
  type Component = (props: any) => HTMLElement;
  type Selector = Component | string;
  export function v(selector: Selector, attr?: any, ...children: any[]): HTMLElement;
  export namespace v {
    export function fragment(...children: any[]): DocumentFragment;
    export const events: WeakMap<HTMLElement, { [event: string]: Event; }>;
    export const ns: { [namespace: string]: string; }
  }
}

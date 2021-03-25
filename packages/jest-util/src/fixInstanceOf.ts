export function fixInstanceOfError(error: typeof Error): void {
  const toString = Object.prototype.toString;
  const originalHasInstance = error[Symbol.hasInstance];
  Object.defineProperty(error, Symbol.hasInstance, {
    value(potentialInstance: any): boolean {
      return this === error
        ? toString.call(potentialInstance) === '[object Error]'
        : originalHasInstance.call(this, potentialInstance);
    },
  });
}

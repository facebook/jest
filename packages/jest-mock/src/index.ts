/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable local/ban-types-eventually, local/prefer-rest-params-eventually */

type Global = NodeJS.Global; // | Window – add once TS improves typings;

export type MockFunctionMetadataType =
  | 'object'
  | 'array'
  | 'regexp'
  | 'function'
  | 'constant'
  | 'collection'
  | 'null'
  | 'undefined';

export type MockFunctionMetadata<
  T,
  Y extends Array<unknown>,
  Type = MockFunctionMetadataType
> = {
  ref?: number;
  members?: Record<string, MockFunctionMetadata<T, Y>>;
  mockImpl?: (...args: Y) => T;
  name?: string;
  refID?: number;
  type?: Type;
  value?: T;
  length?: number;
};

export interface Mock<T, Y extends Array<unknown> = Array<unknown>>
  extends Function,
    MockInstance<T, Y> {
  new (...args: Y): T;
  (...args: Y): T;
}

export interface SpyInstance<T, Y extends Array<unknown>>
  extends MockInstance<T, Y> {}

export interface MockInstance<T, Y extends Array<unknown>> {
  _isMockFunction: true;
  _protoImpl: Function;
  getMockName(): string;
  getMockImplementation(): Function | undefined;
  mock: MockFunctionState<T, Y>;
  mockClear(): this;
  mockReset(): this;
  mockRestore(): void;
  mockImplementation(fn: (...args: Y) => T): this;
  mockImplementation(fn: () => Promise<T>): this;
  mockImplementationOnce(fn: (...args: Y) => T): this;
  mockImplementationOnce(fn: () => Promise<T>): this;
  mockName(name: string): this;
  mockReturnThis(): this;
  mockReturnValue(value: T): this;
  mockReturnValueOnce(value: T): this;
  mockResolvedValue(value: Unpromisify<T>): this;
  mockResolvedValueOnce(value: Unpromisify<T>): this;
  mockRejectedValue(value: unknown): this;
  mockRejectedValueOnce(value: unknown): this;
}

type Unpromisify<T> = T extends Promise<infer R> ? R : never;

/**
 * Possible types of a MockFunctionResult.
 * 'return': The call completed by returning normally.
 * 'throw': The call completed by throwing a value.
 * 'incomplete': The call has not completed yet. This is possible if you read
 *               the  mock function result from within the mock function itself
 *               (or a function called by the mock function).
 */
type MockFunctionResultType = 'return' | 'throw' | 'incomplete';

/**
 * Represents the result of a single call to a mock function.
 */
type MockFunctionResult = {
  /**
   * Indicates how the call completed.
   */
  type: MockFunctionResultType;
  /**
   * The value that was either thrown or returned by the function.
   * Undefined when type === 'incomplete'.
   */
  value: unknown;
};

type MockFunctionState<T, Y extends Array<unknown>> = {
  calls: Array<Y>;
  instances: Array<T>;
  invocationCallOrder: Array<number>;
  /**
   * List of results of calls to the mock function.
   */
  results: Array<MockFunctionResult>;
};

type MockFunctionConfig = {
  mockImpl: Function | undefined;
  mockName: string;
  specificReturnValues: Array<unknown>;
  specificMockImpls: Array<Function>;
};

// see https://github.com/Microsoft/TypeScript/issues/25215
type NonFunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends (...args: Array<any>) => any ? never : K;
}[keyof T] &
  string;
type FunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends (...args: Array<any>) => any ? K : never;
}[keyof T] &
  string;

const MOCK_CONSTRUCTOR_NAME = 'mockConstructor';

const FUNCTION_NAME_RESERVED_PATTERN = /[\s!-\/:-@\[-`{-~]/;
const FUNCTION_NAME_RESERVED_REPLACE = new RegExp(
  FUNCTION_NAME_RESERVED_PATTERN.source,
  'g',
);

const RESERVED_KEYWORDS = new Set([
  'arguments',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'eval',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
]);

function matchArity(fn: Function, length: number): Function {
  let mockConstructor;

  switch (length) {
    case 1:
      mockConstructor = function (this: unknown, _a: unknown) {
        return fn.apply(this, arguments);
      };
      break;
    case 2:
      mockConstructor = function (this: unknown, _a: unknown, _b: unknown) {
        return fn.apply(this, arguments);
      };
      break;
    case 3:
      mockConstructor = function (
        this: unknown,
        _a: unknown,
        _b: unknown,
        _c: unknown,
      ) {
        return fn.apply(this, arguments);
      };
      break;
    case 4:
      mockConstructor = function (
        this: unknown,
        _a: unknown,
        _b: unknown,
        _c: unknown,
        _d: unknown,
      ) {
        return fn.apply(this, arguments);
      };
      break;
    case 5:
      mockConstructor = function (
        this: unknown,
        _a: unknown,
        _b: unknown,
        _c: unknown,
        _d: unknown,
        _e: unknown,
      ) {
        return fn.apply(this, arguments);
      };
      break;
    case 6:
      mockConstructor = function (
        this: unknown,
        _a: unknown,
        _b: unknown,
        _c: unknown,
        _d: unknown,
        _e: unknown,
        _f: unknown,
      ) {
        return fn.apply(this, arguments);
      };
      break;
    case 7:
      mockConstructor = function (
        this: unknown,
        _a: unknown,
        _b: unknown,
        _c: unknown,
        _d: unknown,
        _e: unknown,
        _f: unknown,
        _g: unknown,
      ) {
        return fn.apply(this, arguments);
      };
      break;
    case 8:
      mockConstructor = function (
        this: unknown,
        _a: unknown,
        _b: unknown,
        _c: unknown,
        _d: unknown,
        _e: unknown,
        _f: unknown,
        _g: unknown,
        _h: unknown,
      ) {
        return fn.apply(this, arguments);
      };
      break;
    case 9:
      mockConstructor = function (
        this: unknown,
        _a: unknown,
        _b: unknown,
        _c: unknown,
        _d: unknown,
        _e: unknown,
        _f: unknown,
        _g: unknown,
        _h: unknown,
        _i: unknown,
      ) {
        return fn.apply(this, arguments);
      };
      break;
    default:
      mockConstructor = function (this: unknown) {
        return fn.apply(this, arguments);
      };
      break;
  }

  return mockConstructor;
}

function getObjectType(value: unknown): string {
  return Object.prototype.toString.apply(value).slice(8, -1);
}

function getType(ref?: unknown): MockFunctionMetadataType | null {
  const typeName = getObjectType(ref);
  if (
    typeName === 'Function' ||
    typeName === 'AsyncFunction' ||
    typeName === 'GeneratorFunction' ||
    typeName === 'AsyncGeneratorFunction'
  ) {
    return 'function';
  } else if (Array.isArray(ref)) {
    return 'array';
  } else if (typeName === 'Object') {
    return 'object';
  } else if (
    typeName === 'Number' ||
    typeName === 'String' ||
    typeName === 'Boolean' ||
    typeName === 'Symbol'
  ) {
    return 'constant';
  } else if (
    typeName === 'Map' ||
    typeName === 'WeakMap' ||
    typeName === 'Set'
  ) {
    return 'collection';
  } else if (typeName === 'RegExp') {
    return 'regexp';
  } else if (ref === undefined) {
    return 'undefined';
  } else if (ref === null) {
    return 'null';
  } else {
    return null;
  }
}

function isReadonlyProp(object: any, prop: string): boolean {
  if (
    prop === 'arguments' ||
    prop === 'caller' ||
    prop === 'callee' ||
    prop === 'name' ||
    prop === 'length'
  ) {
    const typeName = getObjectType(object);
    return (
      typeName === 'Function' ||
      typeName === 'AsyncFunction' ||
      typeName === 'GeneratorFunction' ||
      typeName === 'AsyncGeneratorFunction'
    );
  }

  if (
    prop === 'source' ||
    prop === 'global' ||
    prop === 'ignoreCase' ||
    prop === 'multiline'
  ) {
    return getObjectType(object) === 'RegExp';
  }

  return false;
}

export class ModuleMocker {
  private _environmentGlobal: Global;
  private _mockState: WeakMap<Mock<any, any>, MockFunctionState<any, any>>;
  private _mockConfigRegistry: WeakMap<Function, MockFunctionConfig>;
  private _spyState: Set<() => void>;
  private _invocationCallCounter: number;

  /**
   * @see README.md
   * @param global Global object of the test environment, used to create
   * mocks
   */
  constructor(global: Global) {
    this._environmentGlobal = global;
    this._mockState = new WeakMap();
    this._mockConfigRegistry = new WeakMap();
    this._spyState = new Set();
    this._invocationCallCounter = 1;
  }

  private _getSlots(object?: Record<string, any>): Array<string> {
    if (!object) {
      return [];
    }

    const slots = new Set<string>();
    const EnvObjectProto = this._environmentGlobal.Object.prototype;
    const EnvFunctionProto = this._environmentGlobal.Function.prototype;
    const EnvRegExpProto = this._environmentGlobal.RegExp.prototype;

    // Also check the builtins in the current context as they leak through
    // core node modules.
    const ObjectProto = Object.prototype;
    const FunctionProto = Function.prototype;
    const RegExpProto = RegExp.prototype;

    // Properties of Object.prototype, Function.prototype and RegExp.prototype
    // are never reported as slots
    while (
      object != null &&
      object !== EnvObjectProto &&
      object !== EnvFunctionProto &&
      object !== EnvRegExpProto &&
      object !== ObjectProto &&
      object !== FunctionProto &&
      object !== RegExpProto
    ) {
      const ownNames = Object.getOwnPropertyNames(object);

      for (let i = 0; i < ownNames.length; i++) {
        const prop = ownNames[i];

        if (!isReadonlyProp(object, prop)) {
          const propDesc = Object.getOwnPropertyDescriptor(object, prop);
          if ((propDesc !== undefined && !propDesc.get) || object.__esModule) {
            slots.add(prop);
          }
        }
      }

      object = Object.getPrototypeOf(object);
    }

    return Array.from(slots);
  }

  private _ensureMockConfig<T, Y extends Array<unknown>>(
    f: Mock<T, Y>,
  ): MockFunctionConfig {
    let config = this._mockConfigRegistry.get(f);
    if (!config) {
      config = this._defaultMockConfig();
      this._mockConfigRegistry.set(f, config);
    }
    return config;
  }

  private _ensureMockState<T, Y extends Array<unknown>>(
    f: Mock<T, Y>,
  ): MockFunctionState<T, Y> {
    let state = this._mockState.get(f);
    if (!state) {
      state = this._defaultMockState();
      this._mockState.set(f, state);
    }
    return state;
  }

  private _defaultMockConfig(): MockFunctionConfig {
    return {
      mockImpl: undefined,
      mockName: 'jest.fn()',
      specificMockImpls: [],
      specificReturnValues: [],
    };
  }

  private _defaultMockState<T, Y extends Array<unknown>>(): MockFunctionState<
    T,
    Y
  > {
    return {
      calls: [],
      instances: [],
      invocationCallOrder: [],
      results: [],
    };
  }

  private _makeComponent<T, Y extends Array<unknown>>(
    metadata: MockFunctionMetadata<T, Y, 'object'>,
    restore?: () => void,
  ): Record<string, any>;
  private _makeComponent<T, Y extends Array<unknown>>(
    metadata: MockFunctionMetadata<T, Y, 'array'>,
    restore?: () => void,
  ): Array<unknown>;
  private _makeComponent<T, Y extends Array<unknown>>(
    metadata: MockFunctionMetadata<T, Y, 'regexp'>,
    restore?: () => void,
  ): RegExp;
  private _makeComponent<T, Y extends Array<unknown>>(
    metadata: MockFunctionMetadata<
      T,
      Y,
      'constant' | 'collection' | 'null' | 'undefined'
    >,
    restore?: () => void,
  ): T;
  private _makeComponent<T, Y extends Array<unknown>>(
    metadata: MockFunctionMetadata<T, Y, 'function'>,
    restore?: () => void,
  ): Mock<T, Y>;
  private _makeComponent<T, Y extends Array<unknown>>(
    metadata: MockFunctionMetadata<T, Y>,
    restore?: () => void,
  ):
    | Record<string, any>
    | Array<unknown>
    | RegExp
    | T
    | undefined
    | Mock<T, Y> {
    if (metadata.type === 'object') {
      return new this._environmentGlobal.Object();
    } else if (metadata.type === 'array') {
      return new this._environmentGlobal.Array();
    } else if (metadata.type === 'regexp') {
      return new this._environmentGlobal.RegExp('');
    } else if (
      metadata.type === 'constant' ||
      metadata.type === 'collection' ||
      metadata.type === 'null' ||
      metadata.type === 'undefined'
    ) {
      return metadata.value;
    } else if (metadata.type === 'function') {
      const prototype =
        (metadata.members &&
          metadata.members.prototype &&
          metadata.members.prototype.members) ||
        {};
      const prototypeSlots = this._getSlots(prototype);
      const mocker = this;
      const mockConstructor = matchArity(function (this: T, ...args: Y) {
        const mockState = mocker._ensureMockState(f);
        const mockConfig = mocker._ensureMockConfig(f);
        mockState.instances.push(this);
        mockState.calls.push(args);
        // Create and record an "incomplete" mock result immediately upon
        // calling rather than waiting for the mock to return. This avoids
        // issues caused by recursion where results can be recorded in the
        // wrong order.
        const mockResult: MockFunctionResult = {
          type: 'incomplete',
          value: undefined,
        };
        mockState.results.push(mockResult);
        mockState.invocationCallOrder.push(mocker._invocationCallCounter++);

        // Will be set to the return value of the mock if an error is not thrown
        let finalReturnValue;
        // Will be set to the error that is thrown by the mock (if it throws)
        let thrownError;
        // Will be set to true if the mock throws an error. The presence of a
        // value in `thrownError` is not a 100% reliable indicator because a
        // function could throw a value of undefined.
        let callDidThrowError = false;

        try {
          // The bulk of the implementation is wrapped in an immediately
          // executed arrow function so the return value of the mock function
          // can be easily captured and recorded, despite the many separate
          // return points within the logic.
          finalReturnValue = (() => {
            if (this instanceof f) {
              // This is probably being called as a constructor
              prototypeSlots.forEach(slot => {
                // Copy prototype methods to the instance to make
                // it easier to interact with mock instance call and
                // return values
                if (prototype[slot].type === 'function') {
                  // @ts-expect-error no index signature
                  const protoImpl = this[slot];
                  // @ts-expect-error no index signature
                  this[slot] = mocker.generateFromMetadata(prototype[slot]);
                  // @ts-expect-error no index signature
                  this[slot]._protoImpl = protoImpl;
                }
              });

              // Run the mock constructor implementation
              const mockImpl = mockConfig.specificMockImpls.length
                ? mockConfig.specificMockImpls.shift()
                : mockConfig.mockImpl;
              return mockImpl && mockImpl.apply(this, arguments);
            }

            // If mockImplementationOnce()/mockImplementation() is last set,
            // implementation use the mock
            let specificMockImpl = mockConfig.specificMockImpls.shift();
            if (specificMockImpl === undefined) {
              specificMockImpl = mockConfig.mockImpl;
            }
            if (specificMockImpl) {
              return specificMockImpl.apply(this, arguments);
            }
            // Otherwise use prototype implementation
            if (f._protoImpl) {
              return f._protoImpl.apply(this, arguments);
            }

            return undefined;
          })();
        } catch (error) {
          // Store the thrown error so we can record it, then re-throw it.
          thrownError = error;
          callDidThrowError = true;
          throw error;
        } finally {
          // Record the result of the function.
          // NOTE: Intentionally NOT pushing/indexing into the array of mock
          //       results here to avoid corrupting results data if mockClear()
          //       is called during the execution of the mock.
          mockResult.type = callDidThrowError ? 'throw' : 'return';
          mockResult.value = callDidThrowError ? thrownError : finalReturnValue;
        }

        return finalReturnValue;
      }, metadata.length || 0);

      const f = (this._createMockFunction(
        metadata,
        mockConstructor,
      ) as unknown) as Mock<T, Y>;
      f._isMockFunction = true;
      f.getMockImplementation = () => this._ensureMockConfig(f).mockImpl;

      if (typeof restore === 'function') {
        this._spyState.add(restore);
      }

      this._mockState.set(f, this._defaultMockState<T, Y>());
      this._mockConfigRegistry.set(f, this._defaultMockConfig());

      Object.defineProperty(f, 'mock', {
        configurable: false,
        enumerable: true,
        get: () => this._ensureMockState(f),
        set: val => this._mockState.set(f, val),
      });

      f.mockClear = () => {
        this._mockState.delete(f);
        return f;
      };

      f.mockReset = () => {
        f.mockClear();
        this._mockConfigRegistry.delete(f);
        return f;
      };

      f.mockRestore = () => {
        f.mockReset();
        return restore ? restore() : undefined;
      };

      f.mockReturnValueOnce = (value: T) =>
        // next function call will return this value or default return value
        f.mockImplementationOnce(() => value);

      f.mockResolvedValueOnce = (value: Unpromisify<T>) =>
        f.mockImplementationOnce(() => Promise.resolve(value as T));

      f.mockRejectedValueOnce = (value: unknown) =>
        f.mockImplementationOnce(() => Promise.reject(value));

      f.mockReturnValue = (value: T) =>
        // next function call will return specified return value or this one
        f.mockImplementation(() => value);

      f.mockResolvedValue = (value: Unpromisify<T>) =>
        f.mockImplementation(() => Promise.resolve(value as T));

      f.mockRejectedValue = (value: unknown) =>
        f.mockImplementation(() => Promise.reject(value));

      f.mockImplementationOnce = (
        fn: ((...args: Y) => T) | (() => Promise<T>),
      ): Mock<T, Y> => {
        // next function call will use this mock implementation return value
        // or default mock implementation return value
        const mockConfig = this._ensureMockConfig(f);
        mockConfig.specificMockImpls.push(fn);
        return f;
      };

      f.mockImplementation = (
        fn: ((...args: Y) => T) | (() => Promise<T>),
      ): Mock<T, Y> => {
        // next function call will use mock implementation return value
        const mockConfig = this._ensureMockConfig(f);
        mockConfig.mockImpl = fn;
        return f;
      };

      f.mockReturnThis = () =>
        f.mockImplementation(function (this: T) {
          return this;
        });

      f.mockName = (name: string) => {
        if (name) {
          const mockConfig = this._ensureMockConfig(f);
          mockConfig.mockName = name;
        }
        return f;
      };

      f.getMockName = () => {
        const mockConfig = this._ensureMockConfig(f);
        return mockConfig.mockName || 'jest.fn()';
      };

      if (metadata.mockImpl) {
        f.mockImplementation(metadata.mockImpl);
      }

      return f;
    } else {
      const unknownType = metadata.type || 'undefined type';
      throw new Error('Unrecognized type ' + unknownType);
    }
  }

  private _createMockFunction<T, Y extends Array<unknown>>(
    metadata: MockFunctionMetadata<T, Y>,
    mockConstructor: Function,
  ): Function {
    let name = metadata.name;
    if (!name) {
      return mockConstructor;
    }

    // Preserve `name` property of mocked function.
    const boundFunctionPrefix = 'bound ';
    let bindCall = '';
    // if-do-while for perf reasons. The common case is for the if to fail.
    if (name && name.startsWith(boundFunctionPrefix)) {
      do {
        name = name.substring(boundFunctionPrefix.length);
        // Call bind() just to alter the function name.
        bindCall = '.bind(null)';
      } while (name && name.startsWith(boundFunctionPrefix));
    }

    // Special case functions named `mockConstructor` to guard for infinite
    // loops.
    if (name === MOCK_CONSTRUCTOR_NAME) {
      return mockConstructor;
    }

    if (
      // It's a syntax error to define functions with a reserved keyword
      // as name.
      RESERVED_KEYWORDS.has(name) ||
      // It's also a syntax error to define functions with a name that starts with a number
      /^\d/.test(name)
    ) {
      name = '$' + name;
    }

    // It's also a syntax error to define a function with a reserved character
    // as part of it's name.
    if (FUNCTION_NAME_RESERVED_PATTERN.test(name)) {
      name = name.replace(FUNCTION_NAME_RESERVED_REPLACE, '$');
    }

    const body =
      'return function ' +
      name +
      '() {' +
      'return ' +
      MOCK_CONSTRUCTOR_NAME +
      '.apply(this,arguments);' +
      '}' +
      bindCall;
    const createConstructor = new this._environmentGlobal.Function(
      MOCK_CONSTRUCTOR_NAME,
      body,
    );

    return createConstructor(mockConstructor);
  }

  private _generateMock<T, Y extends Array<unknown>>(
    metadata: MockFunctionMetadata<T, Y>,
    callbacks: Array<Function>,
    refs: {
      [key: string]:
        | Record<string, any>
        | Array<unknown>
        | RegExp
        | T
        | undefined
        | Mock<T, Y>;
    },
  ): Mock<T, Y> {
    // metadata not compatible but it's the same type, maybe problem with
    // overloading of _makeComponent and not _generateMock?
    // @ts-expect-error
    const mock = this._makeComponent(metadata);
    if (metadata.refID != null) {
      refs[metadata.refID] = mock;
    }

    this._getSlots(metadata.members).forEach(slot => {
      const slotMetadata = (metadata.members && metadata.members[slot]) || {};
      if (slotMetadata.ref != null) {
        callbacks.push(
          (function (ref) {
            return () => (mock[slot] = refs[ref]);
          })(slotMetadata.ref),
        );
      } else {
        mock[slot] = this._generateMock(slotMetadata, callbacks, refs);
      }
    });

    if (
      metadata.type !== 'undefined' &&
      metadata.type !== 'null' &&
      mock.prototype &&
      typeof mock.prototype === 'object'
    ) {
      mock.prototype.constructor = mock;
    }

    return mock as Mock<T, Y>;
  }

  /**
   * @see README.md
   * @param _metadata Metadata for the mock in the schema returned by the
   * getMetadata method of this module.
   */
  generateFromMetadata<T, Y extends Array<unknown>>(
    _metadata: MockFunctionMetadata<T, Y>,
  ): Mock<T, Y> {
    const callbacks: Array<Function> = [];
    const refs = {};
    const mock = this._generateMock(_metadata, callbacks, refs);
    callbacks.forEach(setter => setter());
    return mock;
  }

  /**
   * @see README.md
   * @param component The component for which to retrieve metadata.
   */
  getMetadata<T, Y extends Array<unknown>>(
    component: T,
    _refs?: Map<T, number>,
  ): MockFunctionMetadata<T, Y> | null {
    const refs = _refs || new Map<T, number>();
    const ref = refs.get(component);
    if (ref != null) {
      return {ref};
    }

    const type = getType(component);
    if (!type) {
      return null;
    }

    const metadata: MockFunctionMetadata<T, Y> = {type};
    if (
      type === 'constant' ||
      type === 'collection' ||
      type === 'undefined' ||
      type === 'null'
    ) {
      metadata.value = component;
      return metadata;
    } else if (type === 'function') {
      // @ts-expect-error this is a function so it has a name
      metadata.name = component.name;
      // @ts-expect-error may be a mock
      if (component._isMockFunction === true) {
        // @ts-expect-error may be a mock
        metadata.mockImpl = component.getMockImplementation();
      }
    }

    metadata.refID = refs.size;
    refs.set(component, metadata.refID);

    let members: {
      [key: string]: MockFunctionMetadata<T, Y>;
    } | null = null;
    // Leave arrays alone
    if (type !== 'array') {
      this._getSlots(component).forEach(slot => {
        if (
          type === 'function' &&
          // @ts-expect-error may be a mock
          component._isMockFunction === true &&
          slot.match(/^mock/)
        ) {
          return;
        }
        // @ts-expect-error no index signature
        const slotMetadata = this.getMetadata<T, Y>(component[slot], refs);
        if (slotMetadata) {
          if (!members) {
            members = {};
          }
          members[slot] = slotMetadata;
        }
      });
    }

    if (members) {
      metadata.members = members;
    }

    return metadata;
  }

  isMockFunction<T>(fn: unknown): fn is Mock<T> {
    return !!fn && (fn as any)._isMockFunction === true;
  }

  fn<T, Y extends Array<unknown>>(
    implementation?: (...args: Y) => T,
  ): Mock<T, Y> {
    const length = implementation ? implementation.length : 0;
    const fn = this._makeComponent<T, Y>({length, type: 'function'});
    if (implementation) {
      fn.mockImplementation(implementation);
    }
    return fn;
  }

  spyOn<T extends {}, M extends NonFunctionPropertyNames<T>>(
    object: T,
    methodName: M,
    accessType: 'get',
  ): SpyInstance<T[M], []>;

  spyOn<T extends {}, M extends NonFunctionPropertyNames<T>>(
    object: T,
    methodName: M,
    accessType: 'set',
  ): SpyInstance<void, [T[M]]>;

  spyOn<T extends {}, M extends FunctionPropertyNames<T>>(
    object: T,
    methodName: M,
  ): T[M] extends (...args: Array<any>) => any
    ? SpyInstance<ReturnType<T[M]>, Parameters<T[M]>>
    : never;

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  spyOn<T extends {}, M extends NonFunctionPropertyNames<T>>(
    object: T,
    methodName: M,
    accessType?: 'get' | 'set',
  ) {
    if (accessType) {
      return this._spyOnProperty(object, methodName, accessType);
    }

    if (typeof object !== 'object' && typeof object !== 'function') {
      throw new Error(
        'Cannot spyOn on a primitive value; ' + this._typeOf(object) + ' given',
      );
    }

    const original = object[methodName];

    if (!this.isMockFunction(original)) {
      if (typeof original !== 'function') {
        throw new Error(
          'Cannot spy the ' +
            methodName +
            ' property because it is not a function; ' +
            this._typeOf(original) +
            ' given instead',
        );
      }

      const isMethodOwner = object.hasOwnProperty(methodName);

      let descriptor = Object.getOwnPropertyDescriptor(object, methodName);
      let proto = Object.getPrototypeOf(object);

      while (!descriptor && proto !== null) {
        descriptor = Object.getOwnPropertyDescriptor(proto, methodName);
        proto = Object.getPrototypeOf(proto);
      }

      let mock: Mock<unknown, Array<unknown>>;

      if (descriptor && descriptor.get) {
        const originalGet = descriptor.get;
        mock = this._makeComponent({type: 'function'}, () => {
          descriptor!.get = originalGet;
          Object.defineProperty(object, methodName, descriptor!);
        });
        descriptor.get = () => mock;
        Object.defineProperty(object, methodName, descriptor);
      } else {
        mock = this._makeComponent({type: 'function'}, () => {
          if (isMethodOwner) {
            object[methodName] = original;
          } else {
            delete object[methodName];
          }
        });
        // @ts-expect-error overriding original method with a Mock
        object[methodName] = mock;
      }

      mock.mockImplementation(function (this: unknown) {
        return original.apply(this, arguments);
      });
    }

    return object[methodName];
  }

  private _spyOnProperty<T extends {}, M extends NonFunctionPropertyNames<T>>(
    obj: T,
    propertyName: M,
    accessType: 'get' | 'set' = 'get',
  ): Mock<T> {
    if (typeof obj !== 'object' && typeof obj !== 'function') {
      throw new Error(
        'Cannot spyOn on a primitive value; ' + this._typeOf(obj) + ' given',
      );
    }

    if (!obj) {
      throw new Error(
        'spyOn could not find an object to spy upon for ' + propertyName + '',
      );
    }

    if (!propertyName) {
      throw new Error('No property name supplied');
    }

    let descriptor = Object.getOwnPropertyDescriptor(obj, propertyName);
    let proto = Object.getPrototypeOf(obj);

    while (!descriptor && proto !== null) {
      descriptor = Object.getOwnPropertyDescriptor(proto, propertyName);
      proto = Object.getPrototypeOf(proto);
    }

    if (!descriptor) {
      throw new Error(propertyName + ' property does not exist');
    }

    if (!descriptor.configurable) {
      throw new Error(propertyName + ' is not declared configurable');
    }

    if (!descriptor[accessType]) {
      throw new Error(
        'Property ' + propertyName + ' does not have access type ' + accessType,
      );
    }

    const original = descriptor[accessType];

    if (!this.isMockFunction(original)) {
      if (typeof original !== 'function') {
        throw new Error(
          'Cannot spy the ' +
            propertyName +
            ' property because it is not a function; ' +
            this._typeOf(original) +
            ' given instead',
        );
      }

      // @ts-expect-error: mock is assignable
      descriptor[accessType] = this._makeComponent({type: 'function'}, () => {
        // @ts-expect-error: mock is assignable
        descriptor![accessType] = original;
        Object.defineProperty(obj, propertyName, descriptor!);
      });

      (descriptor[accessType] as Mock<T>).mockImplementation(function (
        this: unknown,
      ) {
        // @ts-expect-error
        return original.apply(this, arguments);
      });
    }

    Object.defineProperty(obj, propertyName, descriptor);
    return descriptor[accessType] as Mock<T>;
  }

  clearAllMocks(): void {
    this._mockState = new WeakMap();
  }

  resetAllMocks(): void {
    this._mockConfigRegistry = new WeakMap();
    this._mockState = new WeakMap();
  }

  restoreAllMocks(): void {
    this._spyState.forEach(restore => restore());
    this._spyState = new Set();
  }

  private _typeOf(value: any): string {
    return value == null ? '' + value : typeof value;
  }
}

const JestMock = new ModuleMocker(global);

export const fn = JestMock.fn;
export const spyOn = JestMock.spyOn;

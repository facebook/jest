# Jest New Diff

I have not thought about the name at all. If there are good suggestions, you are more than welcome.

## Motivation

`jest-diff` package works by serializing the values and then diffing the serializations. This approach works for most of the scenarios but has a few edge cases. New Diff tries to address these limitations by first by diffing the values and then serializing the differences.

## Understanding design and codebase

Note: Consider this as my attempt to write something that works to improve my understanding of the problem space.

API is almost identical to `jest-diff`. There are two extra fields added to the options but the rest is the same. For now, not options are partially implemented.

There are two major components in the current implementation.

1. `diff` function which returns DiffObject(Representation of difference between two values as a JS object)
2. `format` function which returns a formatted string based on DiffObject

There is support for plugins. I have made ReactElement and AsymmetricMatcher Plugin, but they are not fully functional.

## `diff`

### supported types:

- [x] primitives (String is the only primitve with childDiffs)
- [x] Date
- [x] RegExp
- [x] Function
- [x] PrimitiveWrapper
- [x] Array
- [x] Object
- [x] Circular
- [x] Map (Does not checks equality of complex value keys)
- [ ] Set
- [ ] DOM Node
- [ ] React
- [x] Asymmetric Any
- [x] Asymmetric Object

I am quite happy with this module. It's clear to me what it does. It recursively marks values as Inserted, Updated, Deleted, Equal or TypeUnequal and returns an object which represents the differences between 2 values.

Note: Diff will also traverse and mark all the children of complex values

## `format`

- [x] primitives
- [x] Function
- [x] Array
- [x] Object
- [x] Circular
- [ ] Date
- [ ] RegExp
- [x] Map
- [ ] Set
- [ ] DOM Node
- [ ] React
- [x] Asymmetric Any
- [x] Asymmetric Object

`format` has two parts, `diffFormat`(desperately needs a name) and `print`. The first one returns an array of `Line` objects and the second serializes this array based on options.

### `Line` type

`Line` is a representation of a terminal line that will be printed on the screen. It has `type` which can be Inserted, Common or Deleted. The type determines the color of the content and diff indicator('-', '+'). `val` is a value that will be serialized. `prefix` and `suffix` are added to the serialized value, as well as `indent`.

`Line` also has `skipSerialize` field which can be set to `true` if you want to the full control of `val` serialization.

Note: `Line` can be printed as multiple lines too, but that is up to print function.

Example:

```ts
const line: Line = {type: Inserted, prefix: '"a": ', sufix: ',', val: {b: 1}};
```

can be rendered as

```
....more diff

-  "a": Object {
     "b": 1,
   },

...more diff
```

or

```
....more diff

-  "a": Object {...},

...more diff
```

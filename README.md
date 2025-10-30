# jscodeshift-typescript

## TypeScript all the way 🚀

Example usage of [jscodeshift](https://github.com/facebook/jscodeshift) _for_ TypeScript _with_ TypeScript:

- TypeScript target files *.ts
- TypeScript transformer
- TypeScript test files
- TypeScript fixtures

## Installation

```shell
npm i
```

## Run a codemod

```shell
npx jscodeshift -t ./src/simple-rename.ts --extensions=ts --parser=ts **/*.ts --print --dry
```

> _Omit `--dry` to write the transformed source back to disk._

## Test

```shell
npm test
```

## Behind the scenes

Use `@typescript-eslint/parser` in [https://astexplorer.net](https://astexplorer.net) when working with the jscodeshift's `parser="ts"`

By default jscodeshift will use the [`babel` parser](https://github.com/facebook/jscodeshift#usage-cli) (`@babel/parser`)

## Resources & Inspiration

- Base https://github.com/chimurai/jscodeshift-typescript-example
- <https://github.com/facebook/jscodeshift/tree/master/sample>
- <https://github.com/facebook/jscodeshift/blob/master/recipes/retain-first-comment.md>
- <https://github.com/elliottsj/jscodeshift-typescript-example>
- <https://astexplorer.net>

## Awesome lists

- <https://github.com/rajasegar/awesome-codemods>
- <https://github.com/sejoker/awesome-jscodeshift>


```shell
npx jscodeshift -t ../../jscodeshift-typescript/src/soc-console-error-to-log-error.ts --extensions=ts --parser=ts ./src/**/*.ts && npm run lint:fix
```

```shell
npx jscodeshift -t ../../jscodeshift-typescript/src/report-console.ts --extensions=ts --parser=ts --run-in-band ./src/**/*.ts > jscodeshift.log
```

NOTE: grep bc macOS
```shell
sort jscodeshift.log | uniq -c | grep -v '^ *1 '
```

```shell
npx jscodeshift -t ../../jscodeshift-typescript/src/report-console.ts --extensions=ts --parser=ts --run-in-band ./src/**/*.ts > jscodeshift.log | sort  | uniq -c | grep -v '^ *1 '
```

```shell
npx jscodeshift -t ../../jscodeshift-typescript/src/soc-report-log-error-signatures.ts --extensions=ts --parser=ts --run-in-band ./src/**/*.ts > jscodeshift.log
```

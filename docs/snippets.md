
```shell
npx jscodeshift -t ../../jscodeshift-typescript/src/soc-console-error-to-log-error.ts --extensions=ts --parser=ts ./src/**/*.ts && npm run lint:fix
```

NOTE: grep bc macOS
```shell
sort jscodeshift.log | uniq -c | grep -v '^ *1 '
```

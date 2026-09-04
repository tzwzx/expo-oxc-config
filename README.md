# @tzwzx/expo-oxc-config

このリポジトリは非推奨です。以前は Expo アプリ群へ整形ツールと共有設定を配布していましたが、現在は各リポジトリが `oxfmt` を直接インストールし、デフォルト設定で使います。

## 移行先

各リポジトリで `oxfmt` を開発依存として直接追加し、スクリプトから実行してください。

```sh
bun add -d -E oxfmt
```

```json
{
  "scripts": {
    "lint": "oxfmt --check",
    "fix": "oxfmt"
  }
}
```

`oxfmt.config.ts` や `.oxfmtrc.*` は作成せず、oxfmt のデフォルト設定を使います。既存の `ultracite` と `@tzwzx/expo-oxc-config` の依存は削除してください。

## このリポジトリの扱い

- 新しい依存関係、実行スクリプト、共有設定は追加しません。
- `package.json` は移行先を案内するためのメタデータだけを残しています。
- 過去の設計資料は履歴として保持しています。現在の運用手順として参照しないでください。

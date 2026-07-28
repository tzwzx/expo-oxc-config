---
root: true
---

# expo-oxc-config

Expo アプリ群が使う **oxlint / oxfmt のツールチェーンと共有ルール**の配布元。アプリではないので Expo も React も入っていない。

> 生成元は `.rulesync/` 配下。ルールを変えるときは生成物（`AGENTS.md` / `CLAUDE.md` / `.claude/skills/`）ではなく生成元を編集し、`bun rulesync` で再生成すること。

## このリポジトリの立ち位置（変更前に必ず理解すること）

- **ツール本体（`oxlint` / `oxfmt` / `ultracite`）と JS プラグイン3種を `dependencies` として所有している。** アプリ側の package.json にはこれらが**無い**。bun が推移的依存の bin もルートの `node_modules/.bin` へ張るため、アプリの `bun lint` はここが配るバイナリで動く
- つまり**ここでのバージョン更新は消費側のアプリすべてに一斉に効く。** 壊した状態で push すると、次に `bun update @tzwzx/expo-oxc-config` したアプリから順に lint が動かなくなる
- 更新は必ず `bun verify` を通してから push する（手順はスキル `update-toolchain` を使う）

## 構成

| ファイル | 役割 |
| --- | --- |
| `oxlint.mjs` / `oxlint.d.mts` | 共有 oxlint 設定。`defineConfig()` がアプリの入口 |
| `oxfmt.mjs` / `oxfmt.d.mts` | 共有 oxfmt 設定。oxfmt は `extends` を解釈しないためスプレッドで合成する |
| `fixtures/` | `bun verify` の検査用資材 |
| `scripts/verify.ts` | ツールチェーンのスモークテスト |

## 破ると静かに壊れる罠

- **`ignorePatterns` はトップレベルで再宣言する。** oxlint の `extends` は ignorePatterns をマージしない（2026-07 に実測確認）。落とすと生成物まで lint 対象になる
- **`oxfmt` は `extends` 非対応**（メンテナが実装を明確に見送っている）。`{ ...ultracite }` のスプレッドで合成する。この形が崩れると**エラーも出ないまま整形が素通りする**（過去に実際に発生）
- **アプリ側から `oxlint` / `oxfmt` を import させない。** 本パッケージの `defineConfig` が唯一の入口。アプリが直接 import すると、package.json に無い依存を参照することになり fallow の未宣言依存検出と矛盾する
- **`fixtures/` は「本来なら指摘されるコード」を意図的に置いている。** lint をきれいに通す場所ではないので、ここのコードを"直して"はいけない

## コマンド

```bash
bun verify    # ツールチェーンが壊れていないかのスモークテスト
bun rulesync  # 共有ルールの取得と AI 設定の生成（.rulesync/ を編集したら実行する）
```

**`postinstall` は置かない。** このリポジトリは他アプリの依存として install されるため、lifecycle スクリプトを持つとアプリ側の `bun install` で「Blocked 1 postinstall」の警告が出る（bun は依存の postinstall を既定でブロックするので実害は無いが、信頼設定を入れると node_modules 内で rulesync が走ってしまう）。クローン直後は `bun rulesync` を手で実行する。

なお **git 依存では `files` フィールドが効かず**、リポジトリ全体がアプリの node_modules へ入る。配布物を絞りたい場合はこの前提で考えること（現状は数十 KB なので許容している）。

ルールの追加・改名・挙動変更は許容する（アプリ側で追従すればよい）。 `bun verify` が捕まえるのは「まともに動かない状態のまま配ってしまう」ことだけ。

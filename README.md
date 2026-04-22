<img src="./Template_Icons/template_keycap.svg" alt="图标" width="40" height="40" />

# [Template] Shortcuts.js

为油猴脚本创建的快捷键管理仓库。

当前仓库采用单仓双分支模式：

- `main`: 源码真源、构建脚本、文档、当前有效图标，以及集中到 `archive/` 的历史资料。
- `release`: 最新 `dist/esm/`、`Site_JS/` 和发布所需 `Site_Icon/`。

## 目录说明

- `src/modules/`: 共享 Template core 源码。
- `src/sites/`: 各站点的 ESM 入口源码，以及 `manifest.js` 站点发布清单。
- `src/userscript/entry.js`: 生成 `.user.js` bootstrap 的模板渲染器。
- `src/userscript/header.txt`: `archive/Template_JS/[Template] shortcut core.js` 归档产物的头部元数据。
- `Site_Icon/`: 当前站点清单实际引用的图标资源。
- `archive/`: 历史归档；包含旧 Template 产物、legacy 脚本、参考资料和未使用的图标素材。
- `dist/esm/`: 本地构建产出的 ESM core 与站点模块；用于发布到 `release` 分支，不纳入 `main` 版本管理。
- `Site_JS/`: 本地构建产出的可安装 userscript bootstrap；用于发布到 `release` 分支，不纳入 `main` 版本管理。

## 构建

```bash
npm run build
```

构建后会：

- 生成 `dist/esm/template-core.js`
- 生成 `dist/esm/sites/*.js`
- 生成 `Site_JS/*.user.js`
- 生成 `archive/Template_JS/[Template] shortcut core.js`

## 准备 `release` 分支内容

```bash
npm run stage:release -- --out-dir /absolute/path/to/template-shortcuts-release
```

这个命令会先执行构建，再把 `release` 分支应包含的最新内容同步到目标目录：

- `dist/esm/`
- `Site_JS/`
- `Site_Icon/` 中被清单引用的图标
- 最小 `README.md`
- `LICENSE`

如果 `--out-dir` 本身就是一个 `release` 分支仓库或 worktree，脚本还会自动把该目录的本地 git 身份配置为 `src/sites/manifest.js` 中声明的发布账号，避免错误回退到全局 git 身份。

## 发布元数据

- 默认情况下，userscript 的 GitHub Raw `@resource` 地址指向本仓库的 `release` 分支；图标地址也默认使用 `release` 分支，但站点清单可按需覆盖为 `main` 或其他分支资源。
- 若你要改成自己的仓库或分支，只需要调整 [src/sites/manifest.js](/Users/zhutaiyu/Downloads/Cursor Workspace/Template_shortcuts/src/sites/manifest.js) 中的发布配置。

# auto-import-dva-model

#### 自动加载 dva model

仿[mijs](https://umijs.org/guide/with-dva.html#usage)的 dva model 加载规则，适用于用其他脚手架搭建的基于 React 的工程，需要集成 dva 时，自动加载页面级 model 及其全局 model

#### 安装

```
npm install --save-dev auto-import-dva-model
```

#### 目录配置

- 路由配置： src/config/route-config.js
```
    {
        path: '/home',
        component: './Home' 或者 './Home/页面名.tsx' 诸如此类
    }
    其中component的路径是相对于src/pages目录来写的
```
    
- 全局 model：src/models/\*_/_.(js|ts)
- 页面 model：src/pages/\*_/_.(js|ts)

利用 webpack 动态加载模块(import(xxx))的 magic comment 特性,实现:

- 将所有路由页面打包到 pages.chunk.js 中
- 将所有页面级 model 打包到 models.chunk.js 中

#### 用法

1.  在入口(src/index.(jsx?|tsx?))除删除原有的挂在代码，改为：

```
import App from './.umi/router'
App.start("#root")
```

2.  修改 package.json
    在原有的 npm start/build 对应的脚本命令前加上：
    initDva && [原有的脚本命令]

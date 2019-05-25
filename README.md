# auto-import-dva-model
自动加载dva model

/**
 * @author liuweitao
 * @date 2019-05-26
 *
 * 适用于非umijs的脚手架搭建的react工程
 * ，需要集成dva时，自动加载页面级model及其全局model
 *
 * 本脚本： [project-root]/router.js
 * 路由配置： [project-root]/config/route-config.js
 * 全局model：[project-root]/src/models下,任何页面都可以访问到
 * 页面model：[project-root]/src/pages/xxx/models/下,该页面只能访问到它及其父级页面的和全局model
 *
 * 利用webpack动态加载模块(import(xxx))的magic comment特性,实现
 * 将所有路由页面打包到pages.chunk.js中
 * 将所有页面级model打包到 models.chunk.js中
 *
 * 实现在webpack环境下，集成dva时(仿umijs)，
 * 1. 自动根据[project-root]/config/route-config.js，
 *    - 生成路由，
 *    - 自动从路由对应compoent所在目录开始，逐层往上扫描并动态加载models文件夹下的dva model，直到src目录为止(即不会扫描src/models/下的全局model)
 *        i.e 路由对应的component所在目录./src/pages/home/a/b
 *        会检测：./src/pages/home/a/b/models/*.js|ts
 *              ./src/pages/home/a/models/*.js|ts
 *              ./src/pages/home/models/*.js|ts
 *              ./src/pages/models/*.js|ts
 *    - 自动挂载[project-root]/src/models/下的全局model
 */

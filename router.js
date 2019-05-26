#!/usr/bin/env node

const config = require('./config/route-config')
const path = require('path')
const glob = require('glob')
const fs = require('fs')

const src = path.resolve(process.cwd(), 'src')
const pagedir = path.resolve(src, 'pages')
const target = path.resolve(src, '.umi')

/** 将Windows环境下路径中的分隔符转为/ */
function slash(path) {
  const isExtendedLengthPath = /^\\\\\?\\/.test(path)
  // eslint-disable-next-line no-control-regex
  const hasNonAscii = /[^\u0000-\u0080]+/.test(path)
  if (isExtendedLengthPath || hasNonAscii) {
    return path
  }
  return path.replace(/\\/g, '/')
}

/** 判断路径的最后一部分是不是src */
function isSrcRoot(path) {
  if (/[/\\]src[/\\]?$/.test(path)) {
    return true
  }
  return false
}

/**
 * 生成全局model的导入语句及其dva的挂载model的语句
 * 在生成src/.umi/router.js时，调用此方法
 * 在生成的代码中插入对应的代码
 */
function importGlobalModels() {
  const globalPath = path.join(src, 'models')
  let files = glob.sync(`${globalPath}/**/*.@(ts|js)`)
  files = files.map((val, idx) => {
    const tmp = slash(path.relative(target, val))
    return `import global${idx} from '${tmp}';`
  })

  const imports = files.join('\n')
  const mountModels = files
    .map((_, idx) => {
      return `app.model(global${idx})`
    })
    .join('\n')
  return {
    imports,
    mountModels
  }
}

/**
 * 递归向上搜索页面级model,
 * 并生成符合dva规范的导入语句字符串：() => [import(xxxx), import(xxx),...]
 */
function getRouteModels(routePath) {
  let models = []
  while (!isSrcRoot(routePath)) {
    const test = path.join(routePath, 'models')
    if (fs.existsSync(test)) {
      const files = glob.sync(`${test}/**/*.@(ts|js)`)
      const tmp = files.map(val => {
        const relativePath = slash(path.relative(target, val))
        const ret = `import(/* webpackChunkName: "models" */'${relativePath}')`
        return ret
      })
      models = [...models, ...tmp]
    }
    routePath = path.dirname(routePath)
  }

  let importModel = `() => ${JSON.stringify(models)}`
  importModel = importModel.replace(/"import/g, 'import')
  importModel = importModel.replace(/\)"/g, ')')
  importModel = importModel.replace(/\\"/g, '"')
  return importModel
}

function _fixComponentPath(item) {
  if (item.component) {
    const absolutePath = path.resolve(pagedir, item.component)
    const relativePath = slash(path.relative(target, absolutePath))
    item.component = `() => import(/* webpackChunkName: "pages" */'${relativePath}')`
    item.models = getRouteModels(absolutePath)
  }
}

function fixComponentPath(config) {
  for (const item of config) {
    _fixComponentPath(item)
    if (item.routes) {
      fixComponentPath(item.routes)
    }
  }
}
fixComponentPath(config)

const { exec } = require('child_process')
exec(`rm -rf ${target} && mkdir ${target}`, (error, stdout, stderr) => {
  if (!error && !stderr) {
    // 创建文件夹没有错误
    const fs = require('fs')
    writeConfig(fs)
    writeRouter(fs)
  }
})

function writeConfig(fs) {
  const configPath = path.resolve(target, 'route-config.js')
  let content = JSON.stringify(config)

  content = content.replace(/"([^"]*)["]:/g, '$1:')
  content = content.replace(/"(\(\) =>.*?[)|\]])"/g, '$1')
  content = content.replace(/\\"/g, '"')

  content = `
/** 这是生成的代码 请勿改动 */
const config = ${content};
export default config;`
  fs.writeFileSync(configPath, content)
}

function writeRouter(fs) {
  let code = `
/**
 * 这是自动生成的代码 请勿改动
*/
import React from 'react'
import dva from 'dva'
import { Redirect, Route, Router, Switch } from 'dva/router'
import dynamic from 'dva/dynamic'
import config from './route-config'

<%=importGlobalModels=%>

function makeRoutes(config, app) {
  const routes = []
  for (const item of config) {
    let route
    if (item.component) {
      const opt = {app}
      opt.component = item.component
      opt.models = item.models
      const WrappedCom = dynamic(opt)
      if (item.routes) {
         route = (<Route exact={false} path={item.path} key={item.path} render={() => (<WrappedCom>{makeRoutes(item.routes, app)}</WrappedCom>)}/>)
      } else {
         route = (<Route key={item.path} exact={true} path={item.path} component={WrappedCom}/>)
      }

    } else if (item.to) {
      route = (<Redirect key={item.path} exact={true} path={item.path} to={item.to}/>)
    }
    if (route) {
      routes.push(route)
    }
  }
  return routes
}

const app = dva()
app.router(({history, app}) => {
  return (
    <Router history={history}>
      <Switch>
        {makeRoutes(config, app)}
      </Switch>
    </Router>)
})

<%=mountGlobalModels=%>
export default app;
  `
  const globalModelInfo = importGlobalModels()
  code = code.replace(/<%=importGlobalModels=%>/, globalModelInfo.imports)
  code = code.replace(/<%=mountGlobalModels=%>/, globalModelInfo.mountModels)
  const routerPath = path.resolve(target, 'router.js')
  fs.writeFileSync(routerPath, code)
}

import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

// Executa o código real com dependências explícitas, sem rede nem banco.
export function loadTypeScript(path, imports = {}) {
  const source = readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    fileName: path,
  })
  const exports = {}
  vm.runInNewContext(outputText, {
    exports, URL, console: { error() {} },
    process: { env: {} },
    require(name) {
      if (!(name in imports)) throw new Error(`Import não simulado: ${name}`)
      return imports[name]
    },
  }, { filename: path })
  return exports
}

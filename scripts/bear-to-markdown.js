var fs = require('fs')
var path = require('path')
var AdmZip = require('adm-zip')
var slugify = require('slugify')

var slugifyOptions = {
    replacement: '-',  // replace spaces with replacement character, defaults to `-`
    remove: undefined, // remove characters that match regex, defaults to `undefined`
    lower: true,      // convert to lower case, defaults to `false`
    strict: true,     // strip special characters except replacement, defaults to `false`
    locale: 'en',       // language code of the locale to use
    trim: true         // trim leading and trailing replacement chars, defaults to `true`
}

function main() {
    var notesDir = path.resolve(`${process.cwd()}/notes`)
    var pagesDir = path.resolve(`${process.cwd()}/pages`)

    if (!fs.existsSync(pagesDir)) {
        fs.mkdirSync(pagesDir)
    }

    var files = fs.readdirSync(notesDir).filter(file => file.endsWith('bearnote') || file.endsWith('panda'))
    files.forEach(file => {
        var fp = path.resolve(`${notesDir}/${file}`)
        var [name, extension] = file.split('.')
        var slug = slugify(name, slugifyOptions)

        var pagePath = path.join(pagesDir, slug)
        var zip = new AdmZip(fp);
        zip.extractAllTo(pagePath);

        fs.cpSync(path.join(pagePath, file), pagePath, { recursive: true })
        fs.rmdirSync(path.join(pagePath, file), { recursive: true, force: true  })
    })
}

main()

module.exports = main

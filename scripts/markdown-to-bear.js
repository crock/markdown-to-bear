#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var process = require('process');
var AdmZip = require('adm-zip');
var slugify = require('slugify');
var axios = require('axios');
var stream = require('stream');
var { promisify } = require('util');

var finished = promisify(stream.finished);

var args = process.argv;

var slugifyOptions = {
    replacement: '-',  // replace spaces with replacement character, defaults to `-`
    remove: /\d/, // remove characters that match regex, defaults to `undefined`
    lower: true,      // convert to lower case, defaults to `false`
    strict: true,     // strip special characters except replacement, defaults to `false`
    locale: 'en',       // language code of the locale to use
    trim: true         // trim leading and trailing replacement chars, defaults to `true`
}

var appName = args.includes('--panda') ? 'panda': 'bear'
var noteExtension = appName === 'bear' ? 'bearnote' : 'panda'
var noteContentExtension = appName === 'bear' ? 'txt' : 'md'

var bearNoteInfo = {
    "creatorIdentifier": `net.shinyfrog.${appName}`,
    "transient": appName === 'bear',
    "type": appName === 'bear' ? 'public.plain-text' : "net.daringfireball.markdown",
    "version": 2
}

console.log(args)
var directory = args.length >= 2 ? path.resolve(args[1]) : process.cwd()
var notesDir = path.join(process.cwd(), `converted-${appName}-notes`)
var tmpDir = path.resolve(`${process.cwd()}/tmp-notes`)

function main() {
    if (!fs.existsSync(notesDir)) {
        fs.mkdirSync(notesDir)
    }
    
    if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir)
    }
    
    var files = fs.readdirSync(directory).filter(file => file.endsWith('md'))
    files.map(async file => {
        var fp = path.resolve(`${directory}/${file}`)
        var filename = file.split('.')[0]
        var slug = slugify(filename, slugifyOptions)

        var notePath = path.join(tmpDir, `${slug}.${noteExtension}`)
        var noteAssetPath = path.join(notePath, 'assets')
        fs.mkdirSync(noteAssetPath, { recursive: true })
        fs.writeFileSync(path.join(notePath, 'info.json'), JSON.stringify(bearNoteInfo, null, 4))

        let contents = fs.readFileSync(fp).toString()
        var patt = /!\[(.*?)\]\((.*?)\)/gim
        var matches = Array.from(contents.matchAll(patt))
        let matchPromises = []
        if (matches.length) {
            matchPromises = matches.map(match => {
                var segments = match[2].split('/')
                var imgName = segments[segments.length - 1]
                contents = contents.replace(match[2], `assets/${imgName}`)
                if (appName === 'bear') {
                    contents = contents.replace(patt, "[$2]")
                }
                console.log(`Downloading ${imgName}...`)
                let writer = fs.createWriteStream(path.join(noteAssetPath, imgName))
                return axios.get(match[2], {responseType: 'stream'})
                    .then(response => {
                        response.data.pipe(writer)
                        return finished(writer)
                    })
                
            })
        }

        await Promise.all(matchPromises)
            
        fs.writeFileSync(path.join(notePath, `text.${noteContentExtension}`), contents)
        var zipPath = path.join(notesDir, `${slug}.${noteExtension}`)
        let zip = new AdmZip();
        zip.addLocalFolder(notePath, `${slug}.${noteExtension}`)
        zip.writeZip(zipPath)
        console.log(`Created Bear Note: ${slug}.${noteExtension}`)
        fs.rmdirSync(path.join(tmpDir, `${slug}.${noteExtension}`), { recursive: true, force: true })
    })
}

main()

module.exports = main

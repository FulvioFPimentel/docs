// [start-readme]
//
// Run this script during the Enterprise deprecation process to download
// static copies of all pages for the oldest supported Enterprise version.
// See the Enterprise deprecation issue template for instructions.
//
// [end-readme]

import path from 'path'
import fs from 'fs'
import scrape from 'website-scraper'
import { program } from 'commander'
import { rimraf } from 'rimraf'
import http from 'http'

import createApp from '@/frame/lib/app'
import EnterpriseServerReleases from '@/versions/lib/enterprise-server-releases'
import loadRedirects from '@/redirects/lib/precompile'
import { loadPageMap, loadPages } from '@/frame/lib/page-data'
import { languageKeys } from '@/languages/lib/languages'
import { RewriteAssetPathsPlugin } from '@/ghes-releases/scripts/deprecate/rewrite-asset-paths'
import type { Page } from '@/types'

const port = '4001'
const host = `http://localhost:${port}`
const version = EnterpriseServerReleases.oldestSupported
const GH_PAGES_URL = `https://github.github.com/docs-ghes-${version}`

// Once page-data.js is converted to TS,
// we can import the more comprehesive type
type PageList = Page[]
type MapObj = { [key: string]: string }

program
  .description(
    'Scrape HTML of the oldest supported Enterprise version and add it to a temp output directory.',
  )
  .option(
    '-o, --output <PATH>',
    `output directory to place scraped HTML files and redirects. By default, this temp directory is named 'tmpArchivalDir_<VERSION_TO_DEPRECATE>'`,
  )
  .option('-l, --local-dev', 'Do not rewrite asset paths to enable testing scraped content locally')
  .option('-d, --dry-run', 'only scrape the first 10 pages for testing purposes')
  .option(
    '-p, --page <PATH>',
    'Note: this option is only used to re-scrape a page after the version was deprecated. Redirects will not be re-created because most of the deprecated content is already removed. This option scrapes a specific page in all languages. Pass the relative path to the page without a version or language prefix. ex: /admin/release-notes',
  )
  .parse(process.argv)

const output = program.opts().output
const dryRun = program.opts().dryRun
const singlePage = program.opts().page
if (singlePage && dryRun) {
  console.log(
    'A dry run cannot be performed when the --page/-p option is used because a dry run scrapes 10 pages at a time.',
  )
  process.exit(1)
}
const localDev = program.opts().localDev
const tmpArchivalDirectory = output
  ? path.join(process.cwd(), output)
  : path.join(process.cwd(), `tmpArchivalDir_${version}`)

main()
async function main() {
  console.log(`Archiving Enterprise version: ${version}`)

  let pageList: PageList, urls: Array<string>
  if (singlePage) {
    const pageName = singlePage.trim().startsWith('/') ? singlePage.slice(1) : singlePage
    const urls = languageKeys
      .map((key) => `/${key}/enterprise-server@${version}/${pageName}`)
      .map((href) => `${host}${href}`)
    console.log(`\nScraping HTML for a single page only:\n${urls.join('\n')}\n`)
  } else {
    pageList = await loadPages(undefined, languageKeys)
    const pageMap = await loadPageMap(pageList)
    const permalinksPerVersion = Object.keys(pageMap)
      .filter((key) => key.includes(`/enterprise-server@${version}`))
      .map((href) => `${host}${href}`)
    urls = dryRun ? permalinksPerVersion.slice(0, 10) : permalinksPerVersion
    if (dryRun) {
      console.log(
        `\nThis is a dry run! Creating HTML for redirects and scraping the first 10 pages only:\n${urls.join('\n')}\n`,
      )
    } else {
      console.log(`Found ${urls.length} pages for version ${version}`)
    }
  }

  // remove temp directory
  await rimraf(tmpArchivalDirectory)

  const app = createApp()
  const server = http.createServer(app)
  server
    .listen(port, async () => {
      console.log(`started server on ${host}`)

      await scrape({
        urls,
        urlFilter: (url: string) => {
          // Do not download assets from other hosts like S3 or octodex.github.com
          // (this will keep them as remote references in the downloaded pages)
          return url.startsWith(`http://localhost:${port}/`)
        },
        directory: tmpArchivalDirectory,
        filenameGenerator: 'bySiteStructure',
        requestConcurrency: 6,
        plugins: [new RewriteAssetPathsPlugin(tmpArchivalDirectory, localDev, GH_PAGES_URL)],
      }).catch((err: Error) => {
        console.error('scraping error')
        console.error(err)
      })

      fs.renameSync(
        path.join(tmpArchivalDirectory, `/localhost_${port}`),
        path.join(tmpArchivalDirectory, version),
      )

      console.log(`\n\ndone scraping! added files to ${tmpArchivalDirectory}\n`)
      if (!singlePage) {
        // create redirect html files to preserve frontmatter redirects
        await createRedirectsFile(pageList, path.join(tmpArchivalDirectory, version))
        console.log(`next step: deprecate ${version} in lib/enterprise-server-releases.js`)
      } else {
        console.log('🏁 Scraping a single page is complete')
      }
      server.close()
    })
    .on('error', (err) => {
      console.log('error listening to port ', port, err)
      server.close()
    })
}

async function createRedirectsFile(pageList: PageList, outputDirectory: string) {
  console.log('Creating redirects file...')
  const redirects = await loadRedirects(pageList)
  const redirectsPerVersion: MapObj = {}

  const redirectEntries: Array<[string, string]> = Object.entries(redirects)

  redirectEntries.forEach(([oldPath, newPath]) => {
    // remove any liquid variables that sneak in
    oldPath = oldPath.replace('/{{ page.version }}', '').replace('/{{ currentVersion }}', '')
    // ignore any old paths that are not in this version
    if (
      !(
        oldPath.includes(`/enterprise-server@${version}`) ||
        oldPath.includes(`/enterprise/${version}`)
      )
    )
      return

    redirectsPerVersion[oldPath] = newPath
  })

  fs.writeFileSync(
    path.join(outputDirectory, 'redirects.json'),
    JSON.stringify(redirectsPerVersion, null, 2),
  )
  console.log(`Wrote ${outputDirectory}/redirects.json`)
}

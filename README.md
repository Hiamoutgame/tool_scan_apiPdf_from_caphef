<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Crawlbot API

This project now exposes a CafeF crawler endpoint to fetch report list JSON by company symbol.

### Endpoint

`GET /crawlbot/api-list`

### Query params

- `company` or `symbols` (required): one symbol or comma separated symbols, for example `VIC` or `VIC,FPT`
- `type` (optional): one of `0`, `1`, `3`, `4`, `5` (default: `1`)
- `year` (optional): integer >= `0` (default: `0` means all years)
- `includeNonPdf` (optional): `true|false` (default: `false`)
- `linkOnly` (optional): `true|false` (default: `false`)

### Example

```bash
curl "http://localhost:3000/crawlbot/api-list?company=VIC&type=1&year=2025&linkOnly=true"
```

### Response shape

The API returns JSON with fields:

- `GeneratedAt`
- `Type`
- `YearFilter`
- `IncludeNonPdf`
- `LinkOnly`
- `Symbols`
- `TotalRecords`
- `Summary`
- `Data`

## PDF Download API

Use this endpoint to automatically download PDF files to the local folder structure:

`download/<company>/<file>.pdf`

### Endpoint

`GET /crawlbot/download-pdfs`

### Query params

- `company` or `symbols` (required): one symbol or comma separated symbols, for example `ACB` or `ACB,FPT`
- `type` (optional): one of `0`, `1`, `3`, `4`, `5` (default: `1`)
- `year` (optional): integer >= `0` (default: `0` means all years)
- `overwrite` (optional): `true|false` (default: `false`)

### Example

```bash
curl "http://localhost:3000/crawlbot/download-pdfs?company=acb&type=1&year=2025"
```

### Download behavior

- Creates folders automatically under `download/<company>`
- Downloads only PDF files
- If `overwrite=false` and filename already exists, it auto-adds a suffix like `(1)`, `(2)`

## OCR JSON to Markdown

Use the local script below to convert an OCR JSON file into a Markdown file:

```bash
npm run ocr:md -- --input asset/a.json --output asset/a.md --overwrite
```

There is also an API endpoint:

`GET /ocr/markdown?input=asset/a.json&output=asset/a.md&overwrite=true`

## Supabase Storage

The backend can upload a local file such as a generated `.md` or downloaded `.pdf`
to Supabase Storage.

### Environment variables

Create a `.env` file from `.env.example` and set:

- `SUPABASE_PROJECT_URL`
- `SUPABASE_PUBLISHABLE_KEY` as the default key for this backend
- `SUPABASE_SERVICE_ROLE_KEY` as an optional fallback
- `SUPABASE_STORAGE_BUCKET`

### API endpoint

`POST /storage/upload`

This endpoint accepts `multipart/form-data`.

Form fields:

- `file` (required): the uploaded file
- `file_path` (required): target path inside the bucket
- `contentType` (optional): defaults to `application/pdf`

Example form usage with `curl`:

```bash
curl -X POST "http://localhost:3000/storage/upload" \
  -F "file=@asset/input-trang-1.pdf" \
  -F "file_path=pdf/input-trang-1.pdf" \
  -F "contentType=application/pdf"
```

When using `SUPABASE_PUBLISHABLE_KEY`, Storage uploads must still be allowed by
your Supabase Storage policies and bucket restrictions.

### CLI upload

```bash
npm run storage:upload -- --local asset/a.md --remote ocr/a.md --upsert
```

## Project setup

```bash
$ npm install
```

## Swagger API Docs

After starting the server, open:

- Swagger UI: `http://localhost:3000/swagger`
- OpenAPI JSON: `http://localhost:3000/swagger-json`

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run with Docker

The Docker setup publishes the API on port `6969` and mounts the local `download/`
folder into the container so downloaded PDFs remain on your machine.

```bash
docker compose up --build
```

After the container starts, open:

- API base URL: `http://localhost:6969`
- Swagger UI: `http://localhost:6969/swagger`
- OpenAPI JSON: `http://localhost:6969/swagger-json`

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

type là nhóm tài liệu cần lấy từ CafeF, nên khác nhau ở loại báo cáo trả về:

0: Tất cả nhóm báo cáo
1: Báo cáo tài chính
3: Bản cáo bạch và báo cáo thường niên
4: Nghị quyết
5: Báo cáo quản trị

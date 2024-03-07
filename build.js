const sass = require("sass");
const chokidar = require("chokidar");
const fs = require("fs");
const path = require("path");
const prettier = require("prettier");

const OUTPUT_DIRECTORY = path.join(__dirname, "../assets");
const IMAGE_TYPES = ["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp"];
const HTML_TYPES = ["html", "xhtml", "xht"];

function inlineFiles(content, fileBasePath) {
  const inlineComments =
    content.match(/(<!--|\/\*)\s*inline\s*"(.*?)"\s*(-->|\*\/)/g) || [];
  for (const comment of inlineComments) {
    const filename = comment.match(/(['"`])(.*?)\1/)[2];

    const filePath = path.join(fileBasePath, filename);
    let fileContent = fs.readFileSync(filePath, "utf8");
    if (filename.endsWith(".scss") || (isSass = filename.endsWith(".sass"))) {
      const result = sass.compileString(fileContent, {
        indentedSyntax: isSass,
      });
      console.log("isSass: ", isSass);
      fileContent = result.css.toString();
    } else if (IMAGE_TYPES.some((type) => filename.endsWith(`.${type}`))) {
      const bytes = fs.readFileSync(filePath);
      const base64 = Buffer.from(bytes).toString("base64");
      const extension = path.extname(filename).slice(1);
      fileContent = `data:image/${extension};base64,${base64}`;
    } else {
      if (HTML_TYPES.some((type) => filename.endsWith(`.${type}`))) {
        fileContent = fileContent.match(/(<html[^>]*>[\s\S]*?<\/html>)/i)[1];
      }

      fileBasePath = path.dirname(filePath);
      fileContent = inlineFiles(fileContent, fileBasePath);
    }

    content = content.replace(comment, fileContent);
  }

  return content;
}

function build() {
  const templatePath = path.join(__dirname, "src", "template.svg");
  let svg = fs.readFileSync(templatePath, "utf8");

  const basePath = path.dirname(templatePath);
  svg = inlineFiles(svg, basePath);

  fs.existsSync(OUTPUT_DIRECTORY) || fs.mkdirSync(OUTPUT_DIRECTORY);
  prettier
    .format(svg, {
      parser: "html",
    })
    .then((formattedSvg) => {
      fs.writeFileSync(path.join(OUTPUT_DIRECTORY, "title.svg"), formattedSvg);
    });
}

build();
if (process.argv.includes("--watch")) {
  chokidar.watch("src/(*.{scss,html}|template.svg)").on("change", build);
}

const fs = require("fs");
const path = require("path");
const marked = require("marked");
const handlebars = require("handlebars");

const inputRootEnvVar = "LIBRARY";
const inputRefinedFolder = "Refined";
const outputRootEnvVar = "EVERBOUNDPRESS";
const outputPagesFolder = "pages";
const fileExtension = ".md";
const outputExtension = ".html";
const templateFile = path.join(__dirname, "assets", "templates", "chapter.hbs");
const tocTemplateFile = path.join(__dirname, "assets", "templates", "toc.hbs"); // Template for TOC
const rootIndexTemplateFile = path.join(
  __dirname,
  "assets",
  "templates",
  "root-index.hbs"
);

// Convert "chapter-1.md" → "chapter-1.html"
function toWebFriendlyName(fileName) {
  return fileName.replace(/\s+/g, "-").toLowerCase();
}

// Convert "chapter-1" → "Chapter 1"
function formatTitle(fileName) {
  return fileName
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// Ensure directory exists, otherwise create it
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Clear the "pages" folder before regenerating files
function clearPagesFolder(outputRoot) {
  const pagesPath = path.join(outputRoot, outputPagesFolder);
  if (fs.existsSync(pagesPath)) {
    fs.rmSync(pagesPath, { recursive: true, force: true });
  }
  ensureDirectoryExists(pagesPath);
}

function convertMarkdownToHtml(
  markdownFilePath,
  outputFilePath,
  fileName,
  template
) {
  try {
    const markdownContent = fs.readFileSync(markdownFilePath, "utf8");
    const htmlContent = marked.parse(markdownContent);
    const chapterName = formatTitle(fileName);
    const templateData = { chapterName, htmlContent };
    const finalHtml = template(templateData);
    fs.writeFileSync(outputFilePath, finalHtml, "utf8");
    console.log(`✅ Converted: ${markdownFilePath} → ${outputFilePath}`);
  } catch (error) {
    console.error(`❌ Error converting ${markdownFilePath}:`, error);
  }
}

// Generate TOC (table of contents) for a book
function generateBookIndex(outputDir, bookName, tocEntries, tocTemplate) {
  try {
    const tocHtml = tocTemplate({ bookName, tocEntries });
    const indexPath = path.join(outputDir, "index.html");
    fs.writeFileSync(indexPath, tocHtml, "utf8");
    console.log(`📖 Generated index.html for book: ${bookName}`);
  } catch (error) {
    console.error("⚠️ Error generating index.html:", error);
  }
}

// Generate root-level index.html
function generateRootIndex(outputRoot, books, rootIndexTemplate) {
  try {
    const rootHtml = rootIndexTemplate({ books });
    const rootIndexPath = path.join(outputRoot, "index.html");
    fs.writeFileSync(rootIndexPath, rootHtml, "utf8");
    console.log(`🌐 Generated root index.html at: ${rootIndexPath}`);
  } catch (error) {
    console.error("⚠️ Error generating root index.html:", error);
  }
}

function processDirectory(inputDir, outputDir, template, tocEntries) {
  fs.readdirSync(inputDir, { withFileTypes: true }).forEach((entry) => {
    const inputPath = path.join(inputDir, entry.name);
    const outputPath = path.join(outputDir, toWebFriendlyName(entry.name));

    if (entry.isDirectory()) {
      ensureDirectoryExists(outputPath);
      processDirectory(inputPath, outputPath, template, tocEntries);
    } else if (entry.isFile() && path.extname(entry.name) === fileExtension) {
      const fileNameWithoutExtension = path.basename(entry.name, fileExtension);
      const outputHtmlPath = path.join(
        outputDir,
        toWebFriendlyName(fileNameWithoutExtension) + outputExtension
      );
      const chapterName = formatTitle(fileNameWithoutExtension);

      // Add chapter to TOC entries
      tocEntries.push({
        name: chapterName,
        link: path.basename(outputHtmlPath),
      });

      convertMarkdownToHtml(
        inputPath,
        outputHtmlPath,
        fileNameWithoutExtension,
        template
      );
    }
  });
}

function main() {
  const inputRoot = process.env[inputRootEnvVar];
  const outputRoot = process.env[outputRootEnvVar];

  if (!inputRoot || !outputRoot) {
    console.error(
      "🚨 Missing environment variables! Please check your configuration."
    );
    return;
  }

  console.log("\n🚀 Starting conversion process...\n");

  // Clear "pages" folder before processing
  clearPagesFolder(outputRoot);

  const inputRefinedPath = path.join(inputRoot, inputRefinedFolder);
  let chapterTemplate, tocTemplate, rootIndexTemplate;

  try {
    chapterTemplate = handlebars.compile(fs.readFileSync(templateFile, "utf8"));
    tocTemplate = handlebars.compile(fs.readFileSync(tocTemplateFile, "utf8")); // Load TOC template
    rootIndexTemplate = handlebars.compile(
      fs.readFileSync(rootIndexTemplateFile, "utf8")
    ); // Load root index template
  } catch (error) {
    console.error("⚠️ Error loading template files", error);
    return;
  }

  // Array to store book data for root index.html
  const books = [];

  fs.readdirSync(inputRefinedPath, { withFileTypes: true }).forEach(
    (bookEntry) => {
      if (bookEntry.isDirectory()) {
        const bookName = formatTitle(bookEntry.name); // Format book name for display
        const bookFolderName = toWebFriendlyName(bookEntry.name); // Web-friendly book folder name
        const inputBookPath = path.join(inputRefinedPath, bookEntry.name);
        const outputBookPath = path.join(
          outputRoot,
          outputPagesFolder,
          bookFolderName
        );
        ensureDirectoryExists(outputBookPath);

        // Array to store TOC entries for the book
        const tocEntries = [];

        processDirectory(
          inputBookPath,
          outputBookPath,
          chapterTemplate,
          tocEntries
        );

        // Generate index.html for the book
        generateBookIndex(outputBookPath, bookName, tocEntries, tocTemplate);

        // Construct cover photo path
        const coverExtensions = [".jpg", ".png"];
        let coverPhoto = "/assets/cover/default.jpg"; // Default placeholder
        for (const ext of coverExtensions) {
          const potentialCoverPath = path.join(
            outputRoot,
            "assets",
            "cover",
            `${bookFolderName}${ext}`
          );
          if (fs.existsSync(potentialCoverPath)) {
            coverPhoto = `/assets/cover/${bookFolderName}${ext}`;
            break;
          }
        }

        // Add book data for root index.html
        books.push({
          bookName,
          coverPhoto,
          indexPath: `/pages/${bookFolderName}/index.html`,
        });

        console.log(`📖 Processed book: ${bookName}`);
      }
    }
  );

  // Generate root-level index.html
  generateRootIndex(outputRoot, books, rootIndexTemplate);

  console.log("\n🎉 All books processed successfully\n");
}

main();

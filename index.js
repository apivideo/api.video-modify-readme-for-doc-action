const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

function removeDocumentationExcluded(content) {
    const documentationExcludedRegex = /<!--<documentation_excluded>-->[\s\S]*?<!--<\/documentation_excluded>-->\n/g;
    return content.replace(documentationExcludedRegex, '');
}

function extractDocumentationOnly(content) {
    const documentationOnlyStart = /<!--<documentation_only>\n/g
    const documentationOnlyEnd = /<\/documentation_only>-->\n/g
    return content.replace(documentationOnlyStart, '').replace(documentationOnlyEnd, '');
}

function addWarningComment(content) {
    const htmlComment = `## THIS FILE IS AUTOMATICALLY GENERATED. DO NOT EDIT. IF YOU NEED TO CHANGE THIS FILE,  CREATE A PR IN THE SOURCE REPOSITORY.\n`;
    return content.replace(/(---\n)([\s]*?title[\s\S]*?)(---\n)/, `$1${htmlComment}$2$3`);
}

function modifyCodeBlocks(text) {
    const regex = /(.*```[^`]*?\{\{[^`]*?```)/g;
    return text.replace(regex, `
{% raw %}
$1
{% endraw %}`);
}

function escapeCurlyBraces(str) {
    return str.replace(/(.*[\//w]+)\{(\w+)\}([\//w]+.*)/g, '$1\\{$2}$3');
}

function removeMarkdownLinksFromMetadata(markdown) {
    const metadataRegex = /---([\s\S]*?)---/g;
  
    const replaceLinks = (text) => text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  
    const processedMarkdown = markdown.replace(metadataRegex, (match, content) => {
      const newContent = replaceLinks(content);
      return `---${newContent}---`;
    });
  
    return processedMarkdown;
  }

try {
    const sourceFilePath = process.env.SOURCE_FILE_PATH;
    const destinationFilePath = process.env.DESTINATION_REPOSITORY_TEMP_FOLDER + "/" + process.env.DESTINATION_PATH + "/" + process.env.DESTINATION_FILENAME;

    const repository = github.context.payload.repository;

    let content = fs.readFileSync(sourceFilePath.trim(), 'utf8');
    content = removeDocumentationExcluded(content);
    content = extractDocumentationOnly(content);
    content = addWarningComment(content);
    // content = modifyCodeBlocks(content);
    content = escapeCurlyBraces(content);
    content = removeMarkdownLinksFromMetadata(content);

    fs.writeFileSync(destinationFilePath.trim(), content);

    core.setOutput("response", "ok");
} catch (error) {
    core.setFailed(error.message);
}

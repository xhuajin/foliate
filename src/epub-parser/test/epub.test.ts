/**
 * epub-parser 冒烟测试：用 fflate 现场构造 EPUB3 / EPUB2 样本，
 * 验证容器、OPF 元数据、目录、章节懒加载、封面与资源读取。
 */
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { DOMParser as XMLDOMParser } from '@xmldom/xmldom';

// xmldom 作为 DOMParser 的替身（浏览器/Electron 环境原生有 DOMParser）
// @ts-expect-error 仅测试环境
globalThis.DOMParser = XMLDOMParser;

import { parseEpub } from '../index';
import type { EpubType } from '../index';

function makeZip(files: Record<string, string | Uint8Array>): Uint8Array {
    const out: Record<string, Uint8Array> = {};
    for (const [name, content] of Object.entries(files)) {
        out[name] = typeof content === 'string' ? strToU8(content) : content;
    }
    return zipSync(out, { level: 6 });
}

const PNG_BYTES = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);

const EPUB3_FILES: Record<string, string | Uint8Array> = {
    'mimetype': 'application/epub+zip',
    'META-INF/container.xml': `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
    'OEBPS/content.opf': `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" page-progression-direction="ltr">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:identifier id="uid">urn:uuid:test-123</dc:identifier>
    <dc:title>测试书</dc:title>
    <dc:creator>作者甲</dc:creator>
    <dc:creator>作者乙</dc:creator>
    <dc:language>zh-CN</dc:language>
    <dc:description>一段描述</dc:description>
    <dc:subject>小说</dc:subject>
    <dc:subject>科幻</dc:subject>
    <dc:date>2024-01-01</dc:date>
    <dc:publisher>测试出版社</dc:publisher>
    <meta property="dcterms:modified">2024-06-01T00:00:00Z</meta>
    <meta name="cover" content="cover-img"/>
  </metadata>
  <manifest>
    <item id="nav" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="cover-img" href="images/cover.png" media-type="image/png" properties="cover-image"/>
    <item id="ch1" href="text/ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="text/ch2.xhtml" media-type="application/xhtml+xml"/>
    <item id="css" href="styles/style.css" media-type="text/css"/>
  </manifest>
  <spine page-progression-direction="ltr">
    <itemref idref="ch1"/>
    <itemref idref="ch2" linear="no"/>
  </spine>
</package>`,
    'OEBPS/toc.xhtml': `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>目录</title></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>目录</h1>
    <ol>
      <li><a href="text/ch1.xhtml">第一章</a>
        <ol>
          <li><a href="text/ch1.xhtml#s1">1.1 小节</a></li>
        </ol>
      </li>
      <li><a href="text/ch2.xhtml">第二章</a></li>
    </ol>
  </nav>
  <nav epub:type="landmarks">
    <ol>
      <li><a href="text/ch1.xhtml">开始阅读</a></li>
    </ol>
  </nav>
  <nav epub:type="page-list">
    <ol>
      <li><a href="text/ch1.xhtml">第1页</a></li>
      <li><a href="text/ch2.xhtml">第2页</a></li>
    </ol>
  </nav>
</body>
</html>`,
    'OEBPS/text/ch1.xhtml': `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>第一章</title><link rel="stylesheet" href="../styles/style.css"/></head>
<body>
  <h2 id="s1">第一章 开头</h2>
  <p>第一章正文 <img src="../images/cover.png" alt="cover"/></p>
</body>
</html>`,
    'OEBPS/text/ch2.xhtml': `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>第二章</title></head>
<body><h2>第二章</h2><p>第二章正文</p></body>
</html>`,
    'OEBPS/styles/style.css': 'body { font-size: 16px; }',
    'OEBPS/images/cover.png': PNG_BYTES,
};

const EPUB2_OPF = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:identifier id="uid">old-book</dc:identifier>
    <dc:title>老书（EPUB2）</dc:title>
    <dc:creator>老作者</dc:creator>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="a" href="a.xhtml" media-type="application/xhtml+xml"/>
    <item id="b" href="b.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="a"/>
    <itemref idref="b"/>
  </spine>
</package>`;

const EPUB2_NCX = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <navMap>
    <navPoint id="np1" playOrder="1">
      <navLabel><text>甲篇</text></navLabel>
      <content src="a.xhtml"/>
      <navPoint id="np2" playOrder="2">
        <navLabel><text>甲篇一</text></navLabel>
        <content src="a.xhtml#p1"/>
      </navPoint>
    </navPoint>
    <navPoint id="np3" playOrder="3">
      <navLabel><text>乙篇</text></navLabel>
      <content src="b.xhtml"/>
    </navPoint>
  </navMap>
  <pageList>
    <pageTarget id="page1">
      <navLabel><text>1</text></navLabel>
      <content src="a.xhtml"/>
    </pageTarget>
  </pageList>
</ncx>`;

const EPUB2_FILES: Record<string, string | Uint8Array> = {
    'mimetype': 'application/epub+zip',
    'META-INF/container.xml': `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`,
    'OEBPS/content.opf': EPUB2_OPF,
    'OEBPS/toc.ncx': EPUB2_NCX,
    'OEBPS/a.xhtml': `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head/><body><h2>甲</h2><p>甲正文</p></body></html>`,
    'OEBPS/b.xhtml': `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head/><body><h2>乙</h2><p>乙正文</p></body></html>`,
};

async function main(): Promise<void> {
    const failures: string[] = [];

    const check = async (name: string, fn: () => void | Promise<void>): Promise<void> => {
        try {
            await fn();
            console.log(`✅ ${name}`);
        } catch (e) {
            failures.push(name);
            console.error(`❌ ${name}\n   ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
        }
    };

    let book: EpubType;

    await check('EPUB3: 解析整体', async () => {
        book = await parseEpub(makeZip(EPUB3_FILES));

        assert.equal(book.metadata.title, '测试书');
        assert.equal(book.metadata.creator, '作者甲, 作者乙');
        assert.equal(book.metadata.author, '作者甲, 作者乙');
        assert.equal(book.metadata.language, 'zh-CN');
        assert.equal(book.metadata.publisher, '测试出版社');
        assert.equal(book.metadata.modified, '2024-06-01T00:00:00Z');
        assert.deepEqual(book.metadata.subject, ['小说', '科幻']);
        assert.equal(book.dir, 'ltr');
        assert.equal(book.sections.length, 2);
        assert.equal(book.getSize() > 0, true);
        assert.equal(book.listFiles().includes('OEBPS/images/cover.png'), true);
    });

    await check('EPUB3: 章节 id 与懒加载', async () => {
        assert.equal(book!.sections[0]!.id, 'OEBPS/text/ch1.xhtml');
        assert.equal(book!.sections[1]!.linear, 'no');
        const doc = await book!.sections[0]!.createDocument();
        assert.ok(doc);
        assert.equal(
            doc.documentElement.textContent?.includes('第一章正文'),
            true,
            '章节正文应存在'
        );
        // 与 foliate-js 一致：createDocument 每次返回全新 Document（插件会移动 body 子节点）
        const doc2 = await book!.sections[0]!.createDocument();
        assert.ok(doc2, '第二次解析应成功');
        assert.notEqual(doc, doc2, '每次应返回新解析的 Document');
        assert.equal(
            doc2.documentElement.textContent?.includes('第一章正文'),
            true,
            '新文档内容应完整'
        );
        assert.equal(book!.sections[1]!.size > 0, true);
    });

    await check('EPUB3: resolveHref 相对路径', () => {
        const s = book!.sections[0]!;
        assert.equal(s.resolveHref('../images/cover.png'), 'OEBPS/images/cover.png');
        assert.equal(s.resolveHref('../../OEBPS/styles/style.css'), 'OEBPS/styles/style.css');
        assert.equal(s.resolveHref('#s1'), 'OEBPS/text/ch1.xhtml');
    });

    await check('EPUB3: TOC 树与 href 解析', () => {
        assert.equal(book!.toc.length, 2);
        const first = book!.toc[0]!;
        assert.equal(first.label, '第一章');
        assert.equal(first.href, 'OEBPS/text/ch1.xhtml');
        assert.equal(first.subitems?.[0]?.label, '1.1 小节');
        assert.equal(first.subitems?.[0]?.href, 'OEBPS/text/ch1.xhtml#s1');
        // landmarks
        assert.equal(book!.landmarks.length, 1);
        assert.equal(book!.landmarks[0]!.label, '开始阅读');
        // pageList
        assert.equal(book!.pageList?.length, 2);
    });

    await check('EPUB3: getCover 与 loadBlob', async () => {
        const cover = await book!.getCover();
        assert.ok(cover, '应有封面');
        assert.equal(cover.type, 'image/png');
        const blob = await book!.loadBlob('OEBPS/styles/style.css');
        assert.ok(blob);
        assert.equal(blob.type, 'text/css');
        const text = await blob.text();
        assert.equal(text, 'body { font-size: 16px; }');
        // 大小写回退
        const ci = await book!.loadBlob('oebps/styles/style.css');
        assert.ok(ci, '大小写回退应成功');
        // 不存在的资源返回 null
        const missing = await book!.loadBlob('no/such/file.txt');
        assert.equal(missing, null);
        // 相对 OPF 路径兜底
        const rel = await book!.loadBlob('styles/style.css');
        assert.ok(rel, '相对 OPF 路径应解析');
    });

    await check('EPUB2: NCX 目录与 pageList', async () => {
        const b2 = await parseEpub(makeZip(EPUB2_FILES));
        assert.equal(b2.metadata.title, '老书（EPUB2）');
        assert.equal(b2.metadata.creator, '老作者');
        assert.equal(b2.toc.length, 2);
        assert.equal(b2.toc[0]!.label, '甲篇');
        assert.equal(b2.toc[0]!.subitems?.[0]?.label, '甲篇一');
        assert.equal(b2.toc[0]!.subitems?.[0]?.href, 'OEBPS/a.xhtml#p1');
        assert.equal(b2.pageList?.length, 1);
        const doc = await b2.sections[1]!.createDocument();
        assert.ok(doc);
        assert.equal(doc.documentElement.textContent?.includes('乙正文'), true);
    });

    await check('容错: 非法文件抛错', async () => {
        await assert.rejects(() => parseEpub(new Uint8Array([1, 2, 3, 4, 5])), /ZIP/, '应识别出非 ZIP');
    });

    if (failures.length) {
        console.error(`\n${failures.length} 项失败: ${failures.join(', ')}`);
        process.exit(1);
    }
    console.log('\n全部通过 ✅');
}

void main();
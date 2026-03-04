const ytdl = require('@distube/ytdl-core');

const url = process.argv[2] || 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'; // Sample video

async function test() {
    console.log(`Testing URL: ${url}`);
    try {
        const info = await ytdl.getInfo(url);
        console.log(`Title: ${info.videoDetails.title}`);

        console.log('\n--- Audio Only Formats ---');
        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
        audioFormats.forEach(f => console.log(`itag: ${f.itag}, container: ${f.container}, audioBitrate: ${f.audioBitrate}`));

        console.log('\n--- Video + Audio (MP4) Formats ---');
        const videoFormats = info.formats.filter(f => f.container === 'mp4' && f.hasAudio && f.hasVideo);
        videoFormats.forEach(f => console.log(`itag: ${f.itag}, container: ${f.container}, quality: ${f.qualityLabel}`));

    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();

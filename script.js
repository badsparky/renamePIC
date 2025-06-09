const fileInput = document.getElementById('fileInput');
const downloadBtn = document.getElementById('downloadBtn');
const preview = document.getElementById('preview');
let files = [];

fileInput.addEventListener('change', async (e) => {
    files = Array.from(e.target.files);
    if (files.length === 0) return;
    preview.innerHTML = '';
    for (const file of files) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        preview.appendChild(img);
    }
    downloadBtn.disabled = false;
});

function getDateTime(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            const view = new DataView(event.target.result);
            try {
                const exif = EXIF.readFromBinaryFile(view);
                const dateStr = exif.DateTimeOriginal || exif.DateTime;
                if (dateStr) {
                    const parts = dateStr.split(/[:\s]/).map(Number);
                    const date = new Date(parts[0], parts[1]-1, parts[2], parts[3]||0, parts[4]||0, parts[5]||0);
                    resolve(date.getTime());
                    return;
                }
            } catch(err) {}
            resolve(null);
        };
        reader.readAsArrayBuffer(file.slice(0, 65536));
    });
}

async function sortFiles(files) {
    const fileInfos = await Promise.all(files.map(async file => {
        const dt = await getDateTime(file);
        return { file, dt };
    }));
    fileInfos.sort((a,b) => {
        if (a.dt && b.dt) return a.dt - b.dt;
        if (a.dt) return -1;
        if (b.dt) return 1;
        return a.file.name.localeCompare(b.file.name);
    });
    return fileInfos.map(info => info.file);
}

downloadBtn.addEventListener('click', async () => {
    const sorted = await sortFiles(files);
    const zip = new JSZip();
    for (let i=0; i<sorted.length; i++) {
        const file = sorted[i];
        const ext = file.name.substring(file.name.lastIndexOf('.')) || '';
        const newName = `${i+1}${ext}`;
        zip.file(newName, file);
    }
    const blob = await zip.generateAsync({type:'blob'});
    saveAs(blob, 'pictures.zip');
});

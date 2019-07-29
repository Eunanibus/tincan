const urlParams = new URLSearchParams(window.location.search);
const key = urlParams.get('k');

window.onload = function(){
    if (!key) {
        init();
    } else {
        retrieve(key)
    }
};

function init() {
    var ic = document.getElementById('init-content');
    ic.style.display = 'block';
    var n = document.getElementById('tin-can-input');
    var btn = document.getElementById('submit');

    n.onkeyup = () => {
        btn.disabled = !n.value;
    };

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        submit();
    });
}

function retrieve(urlKey) {
    const invalidParamsErrMsg = `Something's not right here. Make sure that link is correct.`;
    try {
        const { id, key } = JSON.parse(atob(urlKey));
        if (id && key) {
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
                if (this.readyState !== 4) return;

                if (this.status === 200) {
                    try {
                        const { data } = JSON.parse(this.response);
                        const decData = CryptoJS.AES.decrypt(data, key).toString(CryptoJS.enc.Utf8);
                        var pc = document.getElementById('claim-success-content');
                        var ro = document.getElementById('retrieved-output');
                        ro.value = decData;
                        pc.style.display = 'block';
                    } catch (e) {
                        showErrorBlock(`I had some trouble unpacking that. Try again.`)
                    }
                } else if (this.status === 404) {
                    showErrorBlock(`I can't find that. Send it again?`);
                }
            };

            xhr.open("POST", '/fetch', true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify({
                id: id
            }));

        } else {
            showErrorBlock(invalidParamsErrMsg)
        }

    } catch (exception) {
        showErrorBlock(invalidParamsErrMsg)
    }

}

function copyURL() {
    var copyText = document.getElementById('submission-url');
    copyText.select();
    document.execCommand("copy");

    var tooltip = document.getElementById("tooltip");
    tooltip.innerHTML = "Copied!";
}

function onOut() {
    var tooltip = document.getElementById("tooltip");
    tooltip.innerHTML = "Copy to Clipboard";
}

function submit() {
    var input = document.getElementById('tin-can-input').value;
    var id = uuid();
    var key = keygen();
    var route = btoa(JSON.stringify({ id: id, key: key }));
    const enc = CryptoJS.AES.encrypt(input, key).toString();

    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
        if (this.readyState !== 4) return;

        var c = document.getElementById('inner-content');
        c.style.display = 'none';

        if (this.status === 200) {
            var url = document.getElementById('submission-url');
            var pcb = document.getElementById('post-sub-content');
            url.value = `${window.location}?k=${route}`;
            pcb.style.display = 'block';
        } else {
            showErrorBlock(`Looks like there was a problem. Why don't you give it another try?`);
        }
    };

    xhr.open("POST", '/submit', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({
        id: id,
        data: enc
    }));
}

function showErrorBlock(message) {
    var c = document.getElementById('inner-content');
    c.style.display = 'none';
    var ec  = document.getElementById('error-content');
    if (message) {
        var et  = document.getElementById('error-text');
        et.innerText = message;
    }
    ec.style.display = 'block';
}

function reset() {
    window.location.href = '/';
}

function keygen() {
    var length = 25,
        charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()[]/;',./{}|:",
        retVal = '';
    for (var i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}

function uuid(){return Math.random().toString(36).substr(2, 9);}


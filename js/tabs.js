function switchTab(tabId) {
    const tabs = document.querySelectorAll('.tab-content');
    const links = document.querySelectorAll('.tab-link');

    tabs.forEach(tab => tab.hidden = true);
    links.forEach(link => link.classList.remove('active'));

    document.getElementById(tabId).hidden = false;
    document.querySelector(`button[onclick="switchTab('${tabId}')"]`).classList.add('active');
}
const PASSWORD_CORRETTA = "admin123";

function loginAdmin() {
  const pass = document.getElementById("adminPass").value;
  if (pass !== PASSWORD_CORRETTA) {
    document.getElementById("errore").textContent = "❌ Password errata";
    return;
  }

  document.getElementById("errore").textContent = "";
  document.getElementById("dati").style.display = "block";
  document.getElementById("medie").style.display = "block";

  caricaDati();
  caricaMedia();
}

async function caricaDati() {
  const res = await fetch("/api/tutti");
  const dati = await res.json();

  const tabella = document.getElementById("tabellaDati");
  tabella.innerHTML = "";

  dati.forEach(riga => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${riga.intSet}</td>
      <td>${riga.itaSet}</td>
      <td>${riga.advSet}</td>
    `;
    tabella.appendChild(tr);
  });
}

async function caricaMedia() {
  const res = await fetch("/api/media");
  const media = await res.json();

  document.getElementById("avgInt").textContent = media.int.toFixed(2);
  document.getElementById("avgIta").textContent = media.ita.toFixed(2);
  document.getElementById("avgAdv").textContent = media.adv.toFixed(2);
}

// Formatira datum rezervacije: "12. jun u 14:30"
export const formatDatum = (iso) => {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('sr-RS', { day: 'numeric', month: 'long' }) +
    ' u ' +
    d.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })
  );
};

// Formatira rok ponude: "Danas do 18:00", "Sutra do 18:00" ili "15. jun do 18:00"
export const formatRok = (iso) => {
  const d = new Date(iso);
  const danas = new Date();
  const sutra = new Date(danas);
  sutra.setDate(danas.getDate() + 1);

  const vreme = d.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });

  if (d.toDateString() === danas.toDateString()) return `Danas do ${vreme}`;
  if (d.toDateString() === sutra.toDateString()) return `Sutra do ${vreme}`;
  return d.toLocaleDateString('sr-RS', { day: 'numeric', month: 'long' }) + ` do ${vreme}`;
};

// Kraći oblik roka: "Danas do 18:00" ili "15. jun do 18:00" (bez "Sutra")
export const formatRokKratko = (iso) => {
  const d = new Date(iso);
  const danas = new Date();
  const vreme = d.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === danas.toDateString()) return `Danas do ${vreme}`;
  return d.toLocaleDateString('sr-RS', { day: 'numeric', month: 'short' }) + ` do ${vreme}`;
};

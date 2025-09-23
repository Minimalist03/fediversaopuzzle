import noahsArkImage from "@/assets/noahs-ark.jpg";
import danielLionsImage from "@/assets/daniel-lions.jpg";
import jesusResurrectedImage from "@/assets/jesus-resurrected.jpg";
import maryJesusBirthImage from "@/assets/mary-jesus-birth.jpg";
import jesusBaptismImage from "@/assets/jesus-baptism.jpg";
import josephEgyptImage from "@/assets/joseph-egypt.jpg";
import davidGoliathImage from "@/assets/david-goliath.jpg";
import mosesRedSeaImage from "@/assets/moses-red-sea.jpg";
import jesusCalmsStormImage from "@/assets/jesus-calms-storm.jpg";
import multiplicationLoavesImage from "@/assets/multiplication-loaves.jpg";

export interface PuzzleImageData {
  id: number;
  title: string;
  image: string;
  verse: string;
  reference: string;
  description: string;
}

export const puzzleImages: PuzzleImageData[] = [
  {
    id: 0,
    title: "A Arca de Noé",
    image: noahsArkImage,
    verse: "Então disse o Senhor a Noé: Entre na arca, você e toda a sua família, porque você é o único justo que encontrei nesta geração.",
    reference: "Gênesis 7:1",
    description: "A história de Noé e os animais na grande arca!"
  },
  {
    id: 1,
    title: "Daniel na Cova dos Leões",
    image: danielLionsImage,
    verse: "Meu Deus enviou o seu anjo e fechou a boca dos leões. Eles não me feriram, porque fui considerado inocente diante dele.",
    reference: "Daniel 6:22",
    description: "Daniel protegido por Deus entre os leões!"
  },
  {
    id: 2,
    title: "Jesus Ressuscitado",
    image: jesusResurrectedImage,
    verse: "Ele não está aqui; ressuscitou! Lembrem-se do que ele lhes disse quando ainda estava na Galileia.",
    reference: "Lucas 24:6",
    description: "A vitória de Jesus sobre a morte!"
  },
  {
    id: 3,
    title: "O Nascimento de Jesus",
    image: maryJesusBirthImage,
    verse: "E deu à luz o seu filho primogênito. Envolveu-o em panos e o colocou numa manjedoura, porque não havia lugar para eles na hospedaria.",
    reference: "Lucas 2:7",
    description: "O nascimento do Salvador do mundo!"
  },
  {
    id: 4,
    title: "O Batismo de Jesus",
    image: jesusBaptismImage,
    verse: "Assim que Jesus foi batizado, saiu da água. Naquele momento os céus se abriram, e ele viu o Espírito de Deus descendo como pomba e pousando sobre ele.",
    reference: "Mateus 3:16",
    description: "Jesus sendo batizado por João Batista!"
  },
  {
    id: 5,
    title: "José do Egito",
    image: josephEgyptImage,
    verse: "Vocês planejaram o mal contra mim, mas Deus o tornou em bem, para que hoje fosse preservada a vida de muitos.",
    reference: "Gênesis 50:20",
    description: "José e sua túnica colorida no Egito!"
  },
  {
    id: 6,
    title: "Davi e Golias",
    image: davidGoliathImage,
    verse: "Você vem contra mim com espada, lança e dardo, mas eu vou contra você em nome do Senhor dos Exércitos, o Deus dos exércitos de Israel.",
    reference: "1 Samuel 17:45",
    description: "A coragem do jovem Davi contra o gigante!"
  },
  {
    id: 7,
    title: "Moisés Abre o Mar Vermelho",
    image: mosesRedSeaImage,
    verse: "Então Moisés estendeu a mão sobre o mar, e toda aquela noite o Senhor fez soprar um forte vento oriental, e as águas se dividiram.",
    reference: "Êxodo 14:21",
    description: "O milagre da passagem pelo Mar Vermelho!"
  },
  {
    id: 8,
    title: "Jesus Acalma a Tempestade",
    image: jesusCalmsStormImage,
    verse: "Ele se levantou, repreendeu o vento e disse ao mar: 'Silêncio! Acalme-se!' O vento parou e fez-se completa calmaria.",
    reference: "Marcos 4:39",
    description: "Jesus mostra seu poder sobre a natureza!"
  },
  {
    id: 9,
    title: "A Multiplicação dos Pães",
    image: multiplicationLoavesImage,
    verse: "Todos comeram e ficaram satisfeitos, e os discípulos recolheram doze cestos cheios de pedaços que sobraram.",
    reference: "Mateus 14:20",
    description: "O milagre da multiplicação dos pães e peixes!"
  }
];
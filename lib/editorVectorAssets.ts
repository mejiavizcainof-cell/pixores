export type EditorVectorCategory = "elements" | "plants" | "animals";

export type EditorVectorAsset = {
  category: EditorVectorCategory;
  name: string;
  svg: string;
};

const stroked = (content: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" stroke="CURRENT_COLOR" stroke-width="34" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`;

const filled = (content: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="CURRENT_COLOR">${content}</svg>`;

export const EDITOR_VECTOR_ASSETS: EditorVectorAsset[] = [
  { category: "elements", name: "Straight Arrow Right", svg: stroked('<path d="M70 256h350M310 135l120 121-120 121"/>') },
  { category: "elements", name: "Straight Arrow Left", svg: stroked('<path d="M442 256H92M202 135 82 256l120 121"/>') },
  { category: "elements", name: "Arrow Up", svg: stroked('<path d="M256 440V90M135 200 256 80l121 120"/>') },
  { category: "elements", name: "Arrow Down", svg: stroked('<path d="M256 72v350M135 312l121 120 121-120"/>') },
  { category: "elements", name: "Curved Arrow Right", svg: stroked('<path d="M85 380c40-188 180-242 330-154M330 112l92 114-130 58"/>') },
  { category: "elements", name: "Curved Arrow Left", svg: stroked('<path d="M427 380C387 192 247 138 97 226M182 112 90 226l130 58"/>') },
  { category: "elements", name: "U Turn Arrow", svg: stroked('<path d="M400 420V210c0-92-74-150-154-150S105 116 105 208M42 145l63 64 64-64"/>') },
  { category: "elements", name: "Circular Arrow", svg: stroked('<path d="M405 185A165 165 0 1 0 420 315M420 315l-6-112-105 40"/>') },
  { category: "elements", name: "Double Arrow", svg: stroked('<path d="M72 190h365M332 88l105 102-105 102M440 332H75M180 230 75 332l105 102"/>') },
  { category: "elements", name: "Chevron Arrow", svg: filled('<path d="M88 205h210V105l150 151-150 151V307H88z"/>') },
  { category: "elements", name: "Alert Triangle", svg: stroked('<path d="M256 64 50 428h412L256 64Z"/><path d="M256 180v116M256 365h1"/>') },
  { category: "elements", name: "Emergency Siren", svg: stroked('<path d="M155 315v-96a101 101 0 0 1 202 0v96M110 315h292v90H110zM256 65V22M105 105 70 70M407 105l35-35M70 220H25M442 220h45"/>') },
  { category: "elements", name: "Dollar Symbol", svg: stroked('<path d="M340 135c-28-35-166-43-166 35 0 94 180 53 180 153 0 86-143 87-191 40M256 70v372"/>') },
  { category: "elements", name: "Money Coin", svg: stroked('<circle cx="256" cy="256" r="190"/><path d="M325 163c-22-27-130-34-130 27 0 73 141 41 141 119 0 67-112 68-150 31M256 118v277"/>') },
  { category: "elements", name: "Poison Skull", svg: stroked('<path d="M135 230a121 121 0 1 1 242 0c0 65-36 93-62 111v67H197v-67c-26-18-62-46-62-111Z"/><circle cx="211" cy="232" r="25"/><circle cx="301" cy="232" r="25"/><path d="m256 280-20 35h40l-20-35ZM204 408v-48M256 408v-48M308 408v-48"/>') },
  { category: "elements", name: "Radioactive", svg: stroked('<circle cx="256" cy="256" r="48"/><path d="M256 208V70a188 188 0 0 1 116 40l-76 115M215 280 95 350a188 188 0 0 1-27-119l137 8M297 280l120 70a188 188 0 0 0 27-119l-137 8"/>') },
  { category: "elements", name: "Chemistry Flask", svg: stroked('<path d="M200 60h112M220 60v130L105 397c-20 36 4 60 45 60h212c41 0 65-24 45-60L292 190V60M160 330h192M190 280h132"/>') },
  { category: "elements", name: "Pi Symbol", svg: filled('<path d="M80 120h352v58h-62v254h-72V178h-85v254h-72V178H80z"/>') },
  { category: "elements", name: "Sigma Symbol", svg: filled('<path d="M100 80h330v72H220l128 104-128 104h220v72H90V370l160-114L100 142z"/>') },
  { category: "elements", name: "Integral Symbol", svg: stroked('<path d="M340 70c-104-24-126 34-132 112l-16 190c-7 82-33 100-97 71M130 185h180M130 365h180"/>') },
  { category: "elements", name: "Infinity Symbol", svg: stroked('<path d="M48 256c54-105 120-105 208 0 88 105 154 105 208 0-54-105-120-105-208 0-88 105-154 105-208 0Z"/>') },
  { category: "elements", name: "Plus Minus", svg: stroked('<path d="M100 155h150M175 80v150M295 155h125M100 360h320"/>') },

  { category: "plants", name: "Simple Leaf", svg: stroked('<path d="M90 412C74 200 210 70 430 72c-8 218-140 352-340 340Z"/><path d="M100 404c92-120 180-203 314-315"/>') },
  { category: "plants", name: "Leaf Branch", svg: stroked('<path d="M100 440c70-160 150-260 310-360M160 330c-90 4-105-75-94-123 82-5 132 39 94 123ZM250 232c-22-88 50-123 99-127 22 78-5 133-99 127ZM274 300c88-15 120 61 118 111-81 16-132-19-118-111Z"/>') },
  { category: "plants", name: "Monstera Leaf", svg: filled('<path d="M255 465C100 430 55 295 92 175 130 53 285 30 390 110c104 80 82 238-16 313-31 24-67 38-119 42Zm-6-57V270l-92 80 69-112-95 19 93-58-67-54 91 31-5-96 43 94 74-77-48 107 105-33-96 76 93 48-112-14-53 127Z"/>') },
  { category: "plants", name: "Cactus", svg: stroked('<path d="M205 445V150c0-55 102-55 102 0v295M205 260h-45c-45 0-58-30-58-68v-48M307 325h46c43 0 58-30 58-68v-48M150 445h212"/>') },
  { category: "plants", name: "Flower", svg: stroked('<circle cx="256" cy="205" r="55"/><path d="M256 150c-83-100-154 20-55 69-126 20-74 151 28 78-22 128 120 128 98 0 102 73 154-58 28-78 99-49 28-169-55-69M256 260v190M256 356c-60-60-110-20-108 34 55 7 92-2 108-34ZM256 390c60-60 110-20 108 34-55 7-92-2-108-34Z"/>') },
  { category: "plants", name: "Palm Tree", svg: stroked('<path d="M260 445c-15-150-10-260 18-350M270 150C200 62 92 100 55 163c105 1 163-5 215-13ZM276 142c67-94 179-66 216-8-97 15-160 21-216 8ZM275 150c-10-102 76-135 142-104-59 64-93 93-142 104ZM273 151c-56-87-145-69-189-15 83 24 134 29 189 15Z"/>') },
  { category: "plants", name: "Sprout", svg: stroked('<path d="M256 445V220M252 250C160 253 98 191 102 100c95-4 158 55 150 150ZM260 305c95 3 155-55 150-146-93-4-157 52-150 146Z"/>') },
  { category: "plants", name: "Pine Tree", svg: filled('<path d="m256 35 150 180h-62l100 120h-138v142H206V335H68l100-120h-62z"/>') },
  { category: "plants", name: "Vine", svg: stroked('<path d="M80 430c260-20 335-160 350-360M150 390c-80-10-90-70-72-108 66 5 100 42 72 108ZM260 320c-6-75 50-101 91-98 8 65-18 103-91 98ZM340 220c-58-45-32-101 4-124 43 48 44 94-4 124Z"/>') },

  { category: "animals", name: "Cat", svg: filled('<path d="M132 210 95 72l118 75c28-10 58-10 86 0l118-75-37 138c35 35 53 77 53 126 0 102-77 150-177 150S79 438 79 336c0-49 18-91 53-126Zm71 78a24 24 0 1 0 0 48 24 24 0 0 0 0-48Zm106 0a24 24 0 1 0 0 48 24 24 0 0 0 0-48Z"/>') },
  { category: "animals", name: "Dog", svg: filled('<path d="M151 148C68 70 44 172 80 254c-20 176 65 229 176 229s196-53 176-229c36-82 12-184-71-106-70-38-140-38-210 0Zm53 138a23 23 0 1 0 0 46 23 23 0 0 0 0-46Zm104 0a23 23 0 1 0 0 46 23 23 0 0 0 0-46Zm-52 62 45 34-45 42-45-42 45-34Z"/>') },
  { category: "animals", name: "Bird", svg: filled('<path d="M35 319c111 3 158-54 194-122 62-117 172-91 248-16-57 8-91 30-115 62 57 28 94 67 115 115-90-34-165-31-231 31-69 65-164 42-211-70Z"/>') },
  { category: "animals", name: "Fish", svg: filled('<path d="M64 256c90-126 238-150 350-54l70-80v268l-70-80C302 406 154 382 64 256Zm245-35a22 22 0 1 0 0 44 22 22 0 0 0 0-44Z"/>') },
  { category: "animals", name: "Butterfly", svg: filled('<path d="M236 235C169 62 45 62 57 193c7 75 72 90 140 91-90 24-131 80-97 145 44 84 127-27 145-119l-9-75Zm40 0C343 62 467 62 455 193c-7 75-72 90-140 91 90 24 131 80 97 145-44 84-127-27-145-119l9-75ZM239 158h34v278h-34z"/>') },
  { category: "animals", name: "Rabbit", svg: filled('<path d="M180 210C95 87 112 24 166 39c46 13 67 95 72 146h36c5-51 26-133 72-146 54-15 71 48-14 171 74 41 105 113 82 188-25 82-91 92-158 92s-133-10-158-92c-23-75 8-147 82-188Z"/>') },
  { category: "animals", name: "Horse Head", svg: filled('<path d="M116 451c36-112 61-191 55-280l65-126 33 95 100-66-27 116c54 71 60 172 7 252-55 82-151 57-233 9Zm164-176 45 12-26 30-19-42Z"/>') },
  { category: "animals", name: "Paw Print", svg: filled('<ellipse cx="256" cy="339" rx="116" ry="104"/><ellipse cx="133" cy="224" rx="52" ry="69" transform="rotate(-25 133 224)"/><ellipse cx="220" cy="153" rx="48" ry="68"/><ellipse cx="292" cy="153" rx="48" ry="68"/><ellipse cx="379" cy="224" rx="52" ry="69" transform="rotate(25 379 224)"/>') },
  { category: "animals", name: "Whale", svg: filled('<path d="M35 282c82-85 178-94 286-57 43 15 70-3 95-44 7-11 18-15 26-5 17 23 12 57-10 81 31-6 55 5 70 25-37 31-76 37-118 14-63 136-253 142-349-14Z"/>') },
];

export function vectorSvgDataUrl(svg: string, color: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replaceAll("CURRENT_COLOR", color))}`;
}

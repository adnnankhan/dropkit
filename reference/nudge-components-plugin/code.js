// Nudge · design system components (final)
// One run: builds every Nudge component on your live variables and styles,
// then adds a Mode variant to each (Dark = default, Light).
const GOOGLE_PNG = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAOdEVYdFNvZnR3YXJlAEZpZ21hnrGWYwAAAexJREFUeAGVU0tPE1EUPucyjfiIVGwXLCTThQZW3poocUEyBRburDtdmDJ/QHThTtIS/8D8g3GpK9qdia2MO+NqTFzoqqNuJEI6QMqjwD2cmT6ntBC+ZB7n3O87r9yD0Ieq1OOXYpdzxwgGmzJ0Enj8/q4dkjXh/vR6+dhr/J2ZXgKFBUCKwxAQCevWtx8riOgHtuiIH0zlOZN1ljjMiCr77+F0hxMG+HN/apGPCt00QXRa0e7NZJAwTUQme73g0QRlJr522whbWH8+WW38uqq3fKdIbVQNPZ5yPD9S0V4FFjmKvVtOQL2SBBanBomHQSMCiRzhysIG4HijdOP1dkT8bPnTS1IwcC4K0dWEgLs8vBCjctvtJxGIJZ6UPigAApVE1AE+XADMH9O4vN/Yug2fD5KPAf5bkQqISnw+1rWDllE2q4MtrJchO4KwatVuw4edSXbGUq750RuW9elypcofPfhXSr0SjRFwXqyn/UDcLOtwTdqP9IHiN2v5tjiAiGnFsHhpz2f5Z7WH6yFgUcFRqUXV2c4larPGzdpsm/Pu/dt5s7ML0l4o8FTzcA6u1e9AcnPOU5RIFwsZP7JM0p4LLhUHQX1YgPHR687mfu2Jazp+s+U+SNtgsTD4KNftl3zejy+8SUXXLDu9/BOUZauyhGuDeAAAAABJRU5ErkJggg==';
const AGENT = {"claude": ["M260.0,530.6 C254.5,526.1 253.0,524.2 250.2,517.7 L246.9,510.2L251.9,487.3 C259.7,451.5 268.7,405.4 272.0,383.5 C273.7,372.5 275.8,360.7 276.7,357.3 C278.4,351.0 278.2,349.3 275.7,350.3 C275.0,350.6 268.6,358.8 261.5,368.6 C207.7,443.2 198.6,455.0 179.6,475.1 C164.7,490.9 160.3,495.0 156.7,496.4 L152.2,498.1L144.8,494.4 C140.8,492.4 137.4,490.7 137.3,490.6 C137.1,490.4 137.4,487.1 137.9,483.1 C139.0,474.2 137.6,476.4 169.5,435.5 C183.2,417.9 202.5,392.9 212.3,380.0 C222.2,367.1 234.5,351.7 239.6,345.8 C248.1,336.2 251.2,330.9 247.7,332.3 C247.0,332.6 219.6,350.2 186.9,371.5 C154.2,392.9 124.0,412.5 119.7,415.3 C112.1,420.1 111.4,420.3 99.9,421.8 L88.0,423.4L82.9,418.4 L77.8,413.5L78.3,405.6 C78.8,398.6 79.1,397.4 81.7,395.0 C83.2,393.4 94.2,385.5 106.1,377.3 C123.2,365.7 138.1,356.8 176.3,335.5 C216.3,313.3 225.1,308.0 225.9,305.8 C227.9,300.2 228.1,300.2 186.0,299.0 C148.5,298.0 137.9,297.5 79.0,294.5 C52.5,293.1 37.6,291.6 35.3,290.1 C34.7,289.8 32.0,286.2 29.1,282.1 C24.3,275.5 23.9,274.5 24.5,271.0 C25.0,267.8 26.0,266.6 29.9,264.1 C35.5,260.4 36.3,260.4 61.5,262.5 C76.7,263.7 113.2,266.1 154.5,268.6 C160.0,268.9 175.9,270.5 189.9,272.1 C226.4,276.3 231.8,275.9 225.2,269.7 C223.7,268.3 198.2,251.0 168.5,231.3 C138.8,211.6 108.7,191.1 101.5,185.9 C94.3,180.6 85.1,174.1 81.0,171.3 C69.9,163.8 66.9,159.2 64.9,145.8 L63.3,135.1L70.5,127.4 L77.6,119.6L88.8,120.7 L100.1,121.8L107.3,127.4 C111.3,130.5 131.2,145.7 151.5,161.2 C171.8,176.7 195.2,194.5 203.3,200.7 C222.1,215.1 221.4,214.7 223.4,213.1 C224.9,211.8 224.8,211.4 222.9,208.1 C221.7,206.1 214.4,192.6 206.7,178.0 C192.1,150.5 167.9,107.9 155.5,88.0 C149.5,78.4 147.9,74.8 145.7,66.4 C141.5,50.7 141.7,49.7 150.6,37.1 C157.7,27.0 158.4,26.3 162.9,25.1 C166.7,24.2 169.5,24.2 177.9,25.5 C183.5,26.3 188.9,27.4 189.8,27.9 C193.7,30.0 197.9,36.1 202.0,45.5 C220.4,88.4 233.8,117.4 246.0,141.0 C253.8,156.1 263.7,175.2 267.9,183.5 C273.2,193.8 276.6,201.7 278.5,208.8 C280.8,217.0 281.7,219.0 283.2,219.0 C284.2,219.0 285.0,218.6 285.0,218.1 C285.0,212.4 288.5,171.5 290.4,155.3 C291.8,143.9 294.3,118.3 296.0,98.5 L299.2,62.5L303.4,52.2 L307.5,42.0L315.3,36.8 L323.1,31.7L329.8,34.6 C335.9,37.3 337.0,38.2 341.4,44.8 L346.4,52.0L343.1,75.3 C341.3,88.0 336.7,112.9 333.0,130.5 C326.2,162.0 319.0,199.6 319.0,203.2 C319.0,206.1 322.3,205.3 325.6,201.8 C327.3,200.0 333.1,192.7 338.5,185.5 C350.7,169.4 382.1,130.1 390.9,120.0 C403.7,105.2 417.6,90.9 424.1,86.0 L430.7,81.0L441.2,81.0 L451.7,81.0L459.8,93.3 L467.9,105.5L464.3,118.0 L460.7,130.5L439.5,157.5 C405.5,200.9 392.8,218.3 384.0,234.0 C376.2,248.0 375.2,251.0 378.5,251.0 C379.4,251.0 393.7,248.0 410.3,244.4 C426.9,240.8 457.1,235.0 477.3,231.5 L514.1,225.2L523.0,229.3 C531.6,233.2 531.9,233.4 532.9,237.6 C533.9,241.5 533.7,242.5 530.4,250.1 C528.5,254.7 526.7,258.6 526.5,258.8 C525.8,259.6 484.4,269.3 464.0,273.6 C424.3,281.8 362.0,296.4 362.3,297.5 C362.9,299.3 397.5,302.0 432.0,303.0 C450.4,303.5 475.3,304.8 487.2,305.8 L508.8,307.6L517.1,312.6 C523.5,316.4 526.3,318.9 530.1,324.0 C535.0,330.5 535.6,332.8 534.4,338.9 C533.8,341.9 532.6,342.7 520.8,348.6 C510.0,354.0 507.3,355.0 504.6,354.4 C502.9,354.1 470.5,346.4 432.5,337.4 C394.6,328.4 362.5,321.0 361.3,321.0 C360.0,321.0 359.0,321.3 359.0,321.8 C359.0,323.1 383.1,346.4 405.5,366.5 C417.6,377.5 439.3,397.1 453.7,410.3 L479.8,434.2L481.0,440.5 C482.2,446.8 482.2,446.9 479.1,451.4 C473.6,459.3 472.8,459.0 445.7,438.4 C423.9,421.8 406.5,407.6 375.5,381.1 C363.4,370.8 359.0,368.2 359.0,371.2 C359.0,371.9 372.5,392.7 388.9,417.5 L418.9,462.5L420.1,474.2 C421.2,485.1 421.2,486.0 419.3,489.2 C417.9,491.7 415.8,493.1 411.0,495.1 C404.7,497.6 404.6,497.6 397.6,496.0 L390.6,494.5L378.2,477.5 C359.0,451.1 329.5,406.5 317.6,385.5 C311.6,375.1 306.6,366.3 306.3,366.1 C304.1,363.6 302.9,373.4 296.1,445.0 C292.1,487.1 288.4,522.2 288.0,523.0 C286.1,526.4 281.0,530.1 274.1,533.0 C270.0,534.6 266.7,536.0 266.6,536.0 C266.6,536.0 263.6,533.5 260.0,530.6 Z M273.4,511.9 C274.8,510.2 276.0,508.2 276.0,507.3 C276.0,506.5 278.5,479.9 281.6,448.3 C287.1,390.6 288.1,375.7 284.7,399.0 C282.8,411.8 272.2,466.6 266.9,491.4 C263.7,506.0 263.7,508.1 267.1,512.3 C269.7,515.7 270.3,515.7 273.4,511.9 Z M405.4,477.8 C406.2,476.5 400.4,467.2 376.2,430.8 L346.0,385.5L346.0,371.2 L346.0,357.0L356.7,357.0 L367.5,357.0L356.7,346.2 L346.0,335.5L346.0,321.7 C346.0,310.2 346.2,308.0 347.5,308.0 C348.8,308.0 349.0,306.0 349.0,295.7 L349.0,283.5L389.2,274.2 C411.4,269.2 439.2,263.0 451.0,260.6 C474.3,255.7 512.8,246.5 513.8,245.6 C514.8,244.5 512.4,242.9 508.9,242.4 C504.2,241.6 464.2,248.6 425.2,257.1 L392.9,264.1L378.2,263.8 L363.5,263.5L363.2,249.5 L362.9,235.4L371.0,221.0 C379.8,205.3 392.6,187.7 426.6,144.5 C439.7,127.8 448.2,116.1 448.7,114.0 C449.6,110.8 449.2,109.9 445.2,103.8 C442.7,100.0 440.4,97.0 440.1,97.0 C437.5,97.0 419.1,115.3 403.4,133.5 C395.2,143.1 363.6,182.6 351.5,198.5 C346.1,205.7 340.3,213.0 338.6,214.8 L335.6,218.0L320.8,218.0 L306.0,218.0L306.0,203.2 C306.0,186.1 308.3,172.3 320.0,117.5 C323.7,99.9 327.6,79.8 328.5,72.9 L330.3,60.3L327.5,56.2 C325.0,52.3 324.7,52.2 322.6,53.5 C321.4,54.4 318.8,59.2 316.4,65.2 L312.2,75.5L309.0,111.5 C307.3,131.3 304.8,156.9 303.4,168.3 C301.5,184.5 298.0,225.4 298.0,231.1 C298.0,231.6 291.3,232.0 283.2,232.0 L268.3,232.0L265.5,221.8 C263.6,214.7 260.2,206.8 254.9,196.5 C250.7,188.2 240.8,169.1 233.0,154.0 C220.8,130.4 206.9,100.2 189.0,58.5 C184.3,47.6 179.5,41.6 174.4,40.1 C171.3,39.2 171.2,39.4 165.3,47.7 C159.4,55.9 159.3,56.3 160.3,59.8 C160.9,61.9 164.6,68.7 168.5,75.0 C181.4,95.7 205.4,138.0 219.8,165.2 C227.6,179.8 234.8,193.3 236.0,195.2 C237.7,198.1 238.0,200.2 238.0,211.6 C238.0,220.4 237.6,225.0 236.8,225.8 C236.0,226.6 231.2,227.0 221.6,227.0 L207.5,227.0L193.5,216.2 C185.8,210.3 164.4,194.0 146.0,180.0 C127.6,166.0 107.1,150.4 100.6,145.3 C94.1,140.2 88.4,136.0 88.0,136.0 C87.6,136.0 85.6,137.8 83.6,140.0 L79.9,144.1L83.2,148.7 C85.1,151.3 89.7,155.4 94.0,158.3 C98.1,161.1 107.3,167.6 114.5,172.9 C121.7,178.1 152.2,198.9 182.5,219.0 C212.8,239.2 238.3,256.6 239.3,257.7 C240.9,259.5 241.1,261.3 240.7,273.6 C240.5,281.3 240.1,294.6 239.9,303.3 L239.5,319.0L250.8,319.0 L262.0,319.0L262.0,328.0 L262.0,337.0L276.5,337.0 L291.0,337.0L291.0,345.2 L291.0,353.5L305.2,353.2 L319.5,352.9L330.4,372.2 C347.5,402.3 400.7,480.6 403.4,479.7 C403.9,479.5 404.8,478.6 405.4,477.8 Z M141.1,380.0 C180.2,354.5 188.4,349.0 179.0,354.3 C176.5,355.7 166.6,361.2 157.0,366.6 C140.2,375.9 97.1,404.6 97.0,406.4 C97.0,408.4 102.6,405.0 141.1,380.0 Z M509.0,335.1 L514.5,332.2L506.5,327.1 C502.1,324.3 496.9,321.5 495.0,321.0 C489.2,319.4 436.4,315.9 423.7,316.2 L412.0,316.5L456.7,327.2 C481.4,333.1 501.9,337.9 502.5,337.9 C503.1,337.9 506.0,336.6 509.0,335.1 Z M167.0,283.9 C160.2,282.9 142.3,281.6 99.5,279.0 C81.3,277.8 62.2,276.6 57.0,276.1 C47.4,275.3 45.5,275.5 47.8,276.9 C50.9,278.8 64.9,280.1 102.0,282.0 C123.7,283.1 143.8,284.1 146.5,284.3 C149.2,284.5 156.2,284.7 162.0,284.7 C171.2,284.7 171.8,284.6 167.0,283.9 Z", 560], "codex": ["M161.0,298.0 C148.0,295.5 138.1,290.9 127.3,282.3 C121.8,277.9 120.0,277.0 118.0,277.5 C116.6,277.9 110.3,278.4 104.0,278.7 C93.8,279.1 91.4,278.9 83.4,276.7 C55.8,269.2 38.7,252.3 30.3,224.5 C28.4,218.1 27.7,197.1 29.3,189.9 C30.0,186.7 29.6,185.8 24.0,178.4 C18.1,170.7 12.0,159.6 12.0,156.7 C12.0,155.9 11.4,153.7 10.6,151.9 C8.8,147.3 7.9,133.0 9.0,124.5 C10.0,116.5 12.7,106.2 14.4,104.0 C15.0,103.2 16.6,100.3 18.0,97.5 C21.0,91.6 36.8,75.1 42.5,72.1 C44.7,70.9 47.2,69.5 48.0,69.0 C48.8,68.4 50.6,67.6 52.0,67.0 C53.4,66.5 55.2,65.6 56.0,65.1 C56.8,64.6 58.8,63.8 60.5,63.4 C62.7,62.7 63.7,61.6 64.5,58.9 C65.0,56.9 66.0,54.7 66.6,53.9 C67.2,53.1 68.1,51.4 68.5,50.1 C71.5,40.4 92.8,18.4 102.1,15.5 C103.4,15.1 105.0,14.1 105.8,13.4 C106.5,12.6 108.8,12.0 110.8,12.0 C112.9,12.0 115.7,11.2 117.0,10.2 C119.1,8.8 121.9,8.5 135.1,8.5 C148.6,8.5 151.1,8.7 152.7,10.2 C153.8,11.2 156.2,12.0 158.2,12.0 C160.3,12.0 162.6,12.8 164.0,14.0 C165.3,15.1 166.9,16.0 167.7,16.0 C169.3,16.0 173.2,18.7 181.4,25.3 C186.6,29.6 187.8,30.1 190.4,29.5 C197.2,27.9 217.3,27.8 221.4,29.3 C223.7,30.1 227.0,31.1 228.8,31.4 C230.6,31.7 236.0,33.9 240.8,36.2 C253.2,42.3 265.0,54.1 270.9,66.2 C275.6,75.8 277.6,82.3 279.1,92.5 C280.1,99.4 279.5,111.6 278.0,115.6 C277.0,118.1 277.8,119.6 285.1,129.2 C288.2,133.2 291.1,137.6 291.5,139.0 C291.9,140.4 292.8,142.2 293.5,143.0 C295.3,145.1 298.0,155.1 299.0,163.5 C300.1,172.0 299.2,185.3 297.4,189.9 C296.6,191.7 296.0,193.9 296.0,194.8 C296.0,200.2 285.1,216.8 275.6,225.8 C267.8,233.2 262.3,236.6 251.5,241.0 C245.6,243.4 244.4,244.3 243.8,246.8 C242.5,251.7 235.0,265.1 230.1,271.4 C221.8,281.9 207.0,291.7 192.2,296.5 C186.0,298.4 167.8,299.3 161.0,298.0 Z M186.5,281.1 C204.2,276.4 217.6,265.7 225.1,250.3 C230.3,239.5 231.0,232.6 231.0,194.8 C231.0,162.0 230.9,160.7 228.9,157.9 C227.8,156.3 226.4,155.0 225.8,155.0 C224.9,155.0 219.2,151.6 209.4,145.2 C207.4,144.0 205.4,143.2 204.9,143.5 C204.4,143.9 204.0,161.3 204.0,186.1 C204.0,213.0 203.6,228.8 203.0,230.1 C202.4,231.1 199.6,233.4 196.7,235.2 C193.8,237.0 190.5,239.1 189.4,239.7 C188.4,240.4 185.9,241.9 184.0,243.0 C182.1,244.1 178.7,246.2 176.5,247.5 C174.3,248.9 171.8,250.3 171.0,250.7 C170.2,251.0 168.8,251.9 168.0,252.5 C166.7,253.6 159.4,257.6 144.5,265.5 C137.8,269.1 138.7,272.3 147.5,276.7 C159.6,282.8 174.1,284.4 186.5,281.1 Z M120.0,260.6 C123.6,259.3 131.3,255.3 137.3,251.8 C143.2,248.4 149.7,244.5 151.8,243.3 C153.8,242.1 157.3,240.1 159.5,238.8 C161.7,237.6 164.7,235.9 166.3,235.1 C167.8,234.2 172.0,231.9 175.6,230.0 C179.3,228.1 183.5,225.0 185.1,223.2 L188.1,219.9L187.8,206.7 C187.4,191.0 187.3,190.9 177.4,196.7 C173.8,198.8 169.6,201.2 167.9,202.1 C166.3,203.0 164.5,204.2 163.8,204.7 C163.1,205.3 158.4,207.9 153.5,210.5 C148.6,213.1 144.1,215.6 143.5,216.0 C142.3,216.9 124.8,227.0 124.5,227.0 C124.3,227.0 121.6,228.6 118.4,230.5 C115.2,232.4 111.9,234.0 111.0,234.0 C109.2,234.0 105.1,231.9 92.0,224.3 C87.3,221.6 79.5,217.2 74.5,214.6 C69.5,211.9 65.0,209.3 64.4,208.9 C63.8,208.4 60.7,206.6 57.4,204.9 C54.2,203.2 50.7,201.1 49.8,200.3 C48.9,199.5 47.1,199.0 45.8,199.2 C42.9,199.6 42.4,203.4 44.0,214.4 C45.9,227.5 52.6,239.2 64.6,250.2 C71.8,256.8 81.6,261.6 91.0,263.1 C99.3,264.5 113.0,263.3 120.0,260.6 Z M255.8,222.3 C262.8,218.2 272.0,208.2 276.2,200.1 C280.2,192.5 284.0,178.8 284.0,172.2 C284.0,166.5 280.6,153.0 277.6,146.7 C274.3,139.7 268.6,132.2 263.2,127.7 C260.9,125.7 252.8,120.6 245.4,116.3 C237.9,112.0 230.4,107.6 228.6,106.5 C226.7,105.4 222.4,102.8 218.9,100.7 C215.4,98.6 209.1,94.8 205.0,92.3 L197.6,87.8L193.5,89.9 C182.5,95.7 171.0,103.4 171.0,105.1 C171.0,105.7 176.3,109.1 187.4,115.3 C189.1,116.3 191.8,117.9 193.5,119.0 C195.2,120.1 198.1,121.8 200.0,122.8 C201.9,123.8 207.8,127.2 213.0,130.2 C218.2,133.2 226.6,137.9 231.7,140.6 C236.7,143.3 242.3,146.8 243.9,148.3 L247.0,151.0L247.0,185.8 C247.0,204.9 247.3,221.5 247.6,222.8 C248.4,225.7 250.1,225.6 255.8,222.3 Z M120.1,211.9 C124.7,209.1 130.2,206.0 132.2,204.9 C139.3,201.2 139.0,200.9 104.2,181.1 C100.0,178.7 94.0,175.3 91.0,173.5 C88.0,171.7 82.3,168.6 78.5,166.5 C69.1,161.5 62.2,156.8 61.5,155.0 C61.1,154.2 60.9,138.2 61.0,119.4 C61.1,86.4 60.6,80.0 58.0,80.0 C56.6,80.0 48.8,85.2 44.0,89.3 C32.3,99.3 24.0,117.9 24.0,133.9 C24.0,141.0 26.5,151.6 29.9,159.2 C34.2,168.6 43.9,179.1 53.0,184.1 C54.9,185.2 58.3,187.2 60.5,188.5 C62.7,189.8 65.5,191.3 66.7,191.9 C67.8,192.4 76.6,197.6 86.2,203.3 C105.8,215.1 109.0,216.9 110.6,217.0 C111.2,217.0 115.5,214.7 120.1,211.9 Z M156.6,190.9 C156.9,190.3 158.7,189.1 160.4,188.3 C170.1,183.7 185.9,174.0 187.0,172.1 C187.6,170.9 188.0,162.6 188.0,152.2 C188.0,135.0 187.9,134.3 185.8,132.3 C183.0,129.7 155.5,114.0 153.7,114.0 C153.0,114.0 151.6,114.6 150.5,115.4 C149.4,116.1 145.6,118.3 142.0,120.2 C128.0,127.8 122.5,131.2 121.2,132.7 C120.4,133.9 120.0,139.6 120.0,153.0 C120.0,171.1 120.1,171.7 122.2,173.7 C125.2,176.3 136.4,182.8 147.2,188.2 C149.2,189.2 151.2,190.4 151.5,191.0 C152.3,192.3 155.7,192.3 156.6,190.9 Z M104.0,119.6 C104.0,83.3 104.2,77.1 105.5,75.3 C106.4,74.0 109.9,71.5 113.3,69.5 C120.8,65.2 122.1,64.4 128.5,60.4 C131.2,58.7 134.7,56.7 136.1,55.9 C137.6,55.1 140.5,53.6 142.6,52.4 C144.8,51.3 151.0,48.0 156.5,45.0 C169.8,38.0 169.3,38.4 168.6,33.2 C168.0,29.1 168.1,28.9 170.3,29.6 C173.0,30.4 173.8,31.6 174.6,35.8 C175.1,38.1 174.8,39.6 173.6,40.9 C172.7,41.9 172.0,43.2 172.0,43.8 C172.0,45.5 176.7,45.3 177.3,43.6 C177.6,42.8 179.5,41.8 181.4,41.4 C185.1,40.8 186.3,38.4 183.5,37.4 C182.7,37.0 182.3,36.4 182.6,35.9 C183.2,34.8 172.8,24.0 171.1,24.0 C170.5,24.0 170.0,23.3 170.0,22.5 C170.0,21.5 169.0,21.0 166.9,21.0 C164.7,21.0 163.7,20.5 163.3,19.0 C162.9,17.4 161.9,17.0 158.3,17.0 C154.7,17.0 153.7,16.6 153.3,15.0 C152.8,13.1 151.9,13.0 135.0,13.0 C118.1,13.0 117.2,13.1 116.7,15.0 C116.3,16.7 115.3,17.0 111.2,17.0 C107.0,17.0 106.0,17.3 105.5,19.0 C105.1,20.3 104.0,21.0 102.5,21.0 C101.1,21.0 99.6,21.9 99.0,23.0 C98.4,24.1 97.5,25.0 96.9,25.0 C95.6,25.0 86.0,34.6 86.0,35.8 C86.0,36.4 85.3,37.0 84.5,37.4 C82.8,38.0 82.4,41.0 84.1,41.0 C84.7,41.0 85.4,40.1 85.7,39.0 C86.0,37.9 86.8,37.0 87.6,37.0 C88.3,37.0 89.3,36.4 89.7,35.7 C90.7,34.1 98.3,29.0 99.7,29.0 C100.3,29.0 101.3,28.3 102.0,27.5 C102.6,26.8 105.1,25.8 107.5,25.4 C109.9,25.1 112.1,24.2 112.4,23.4 C112.8,22.5 114.5,22.0 117.6,22.0 C121.6,22.0 122.1,22.2 121.0,23.5 C120.3,24.3 118.1,25.0 116.0,25.0 C113.6,25.0 111.7,25.7 110.5,27.0 C109.5,28.1 107.9,29.0 106.9,29.0 C104.6,29.0 93.2,38.4 88.8,44.0 C83.1,51.3 79.0,60.4 77.4,69.6 C76.3,76.2 76.0,85.6 76.2,111.9 C76.5,144.2 76.6,145.9 78.5,148.0 C79.6,149.2 81.9,151.0 83.6,151.9 C90.1,155.2 100.0,161.2 100.5,162.0 C100.8,162.5 101.7,162.7 102.5,162.3 C103.8,161.9 104.0,155.8 104.0,119.6 Z M131.0,109.0 C134.6,106.9 138.8,104.4 140.5,103.5 C142.2,102.7 144.8,101.1 146.5,100.0 C148.2,99.0 152.9,96.3 157.0,94.2 C164.6,90.2 177.4,83.2 183.6,79.5 C194.0,73.3 196.4,72.0 197.4,72.1 C198.5,72.1 200.3,73.1 217.7,83.2 C223.1,86.3 231.1,90.7 235.5,93.0 C239.9,95.4 245.1,98.2 247.2,99.4 C249.2,100.5 253.0,102.8 255.6,104.3 C262.4,108.3 264.4,107.7 264.8,101.8 C265.8,85.9 260.2,72.4 247.0,59.1 C236.1,48.2 228.2,43.8 215.3,41.6 C207.2,40.2 205.4,40.2 197.7,41.5 C188.1,43.2 181.8,45.7 174.8,50.6 C172.2,52.5 169.7,54.0 169.3,54.0 C168.8,54.0 165.9,55.8 162.6,58.1 C159.4,60.3 155.8,62.6 154.6,63.1 C153.5,63.6 149.3,65.8 145.5,68.0 C141.7,70.2 135.7,73.4 132.2,75.2 C128.7,77.0 124.5,79.6 122.7,81.1 L119.5,83.8L119.2,96.3 C118.7,114.5 119.8,115.8 131.0,109.0 Z M157.2,55.5 C156.9,54.0 153.7,54.3 153.2,55.8 C152.9,56.7 153.5,57.1 155.1,56.8 C156.4,56.7 157.4,56.0 157.2,55.5 Z M163.8,51.2 C164.1,50.3 163.6,49.9 162.4,50.2 C161.5,50.3 160.5,51.1 160.2,51.8 C159.9,52.7 160.4,53.1 161.6,52.8 C162.5,52.7 163.5,51.9 163.8,51.2 Z M170.0,47.5 C170.0,46.7 169.4,46.0 168.6,46.0 C166.9,46.0 165.8,47.4 166.7,48.4 C167.9,49.6 170.0,49.0 170.0,47.5 Z M81.8,43.6 C82.1,42.4 81.7,41.9 80.8,42.2 C80.1,42.5 79.3,43.5 79.2,44.4 C78.9,45.6 79.3,46.1 80.2,45.8 C80.9,45.5 81.7,44.5 81.8,43.6 Z M239.5,44.0 C239.8,43.4 239.4,42.7 238.5,42.4 C236.6,41.6 235.5,42.4 236.5,43.9 C237.3,45.3 238.7,45.3 239.5,44.0 Z M232.3,39.5 C232.4,39.0 231.3,38.4 229.8,38.2 C228.2,38.0 227.0,38.3 227.0,38.9 C227.0,40.9 231.9,41.5 232.3,39.5 Z M221.0,35.3 C221.0,33.9 221.3,33.9 205.5,33.5 C197.7,33.4 193.7,33.7 191.8,34.7 C190.2,35.4 189.0,36.2 189.0,36.4 C189.0,36.7 196.2,36.8 205.0,36.7 C217.6,36.7 221.0,36.4 221.0,35.3 Z M161.2,28.3 C158.8,27.3 160.1,25.9 163.2,26.2 C166.9,26.6 168.4,29.0 164.8,28.9 C163.6,28.9 161.9,28.6 161.2,28.3 Z M149.0,24.0 C147.8,23.2 147.8,23.0 149.2,22.5 C151.6,21.5 156.3,22.3 156.8,23.8 C157.2,25.2 151.3,25.5 149.0,24.0 Z M127.5,21.0 C125.7,20.3 125.7,20.1 128.5,19.0 C131.4,17.8 139.9,18.2 142.1,19.6 C145.4,21.6 132.1,22.9 127.5,21.0 Z", 307], "cursor": ["M106.5,321.5 C66.9,298.7 33.5,278.8 32.2,277.4 L30.0,274.9L30.0,185.5 L30.0,96.1L32.2,93.6 C33.5,92.1 66.9,72.3 106.5,49.4 L178.5,7.9L186.0,8.2 L193.5,8.6L215.5,21.4 C250.5,41.8 260.3,47.4 299.5,70.0 C319.9,81.7 337.5,92.3 338.8,93.7 L341.0,96.1L341.0,185.0 L341.0,274.0L338.2,277.0 C336.1,279.3 269.5,318.4 199.9,358.1 C192.1,362.6 190.8,363.0 184.9,363.0 L178.4,363.0L106.5,321.5 Z M257.0,313.8 C295.2,291.8 326.6,273.6 326.8,273.5 C327.0,273.3 313.2,265.2 296.3,255.4 C279.4,245.6 264.1,236.8 262.4,235.8 L259.2,233.9L226.5,290.7 C208.5,322.0 193.1,348.3 192.2,349.2 C191.2,350.4 189.2,351.0 186.5,351.0 C182.9,351.0 182.1,350.6 181.6,348.8 C181.3,347.5 181.0,312.2 181.0,270.2 C181.0,228.3 180.7,194.0 180.4,194.0 C179.3,194.0 44.0,272.4 44.0,272.9 C44.0,273.3 74.3,290.9 111.3,312.2 C148.2,333.6 179.8,351.9 181.5,352.9 C183.2,354.0 185.2,354.6 186.0,354.4 C186.8,354.1 218.8,335.8 257.0,313.8 Z M221.5,279.6 C239.0,249.3 253.7,223.4 254.2,221.8 C254.8,220.3 255.6,219.0 256.0,219.0 C256.5,219.0 257.4,217.4 258.0,215.5 C258.6,213.6 259.5,212.0 260.0,212.0 C260.4,212.0 261.1,210.9 261.4,209.5 C261.8,208.1 262.4,207.0 262.9,207.0 C263.4,207.0 264.4,205.4 265.0,203.5 C265.6,201.6 266.5,200.0 267.0,200.0 C267.5,200.0 268.4,198.4 269.0,196.5 C269.6,194.6 270.5,193.0 271.0,193.0 C271.5,193.0 272.4,191.4 273.0,189.5 C273.6,187.6 274.6,186.0 275.1,186.0 C275.6,186.0 276.0,185.4 276.0,184.7 C276.0,183.9 276.9,182.3 278.0,181.0 C279.1,179.7 280.0,178.2 280.0,177.5 C280.0,176.8 280.9,175.3 282.0,174.0 C283.1,172.7 284.0,171.2 284.0,170.5 C284.0,169.8 284.9,168.3 286.0,167.0 C287.1,165.7 288.0,164.1 288.0,163.3 C288.0,162.6 288.4,162.0 288.9,162.0 C289.4,162.0 290.4,160.4 291.0,158.5 C291.6,156.6 292.5,155.0 293.0,155.0 C293.5,155.0 294.4,153.4 295.0,151.5 C295.6,149.6 296.5,148.0 297.0,148.0 C297.5,148.0 298.4,146.4 299.0,144.5 C299.6,142.6 300.5,141.0 301.0,141.0 C301.4,141.0 302.1,139.9 302.4,138.5 C302.8,137.1 303.4,136.0 303.9,136.0 C304.4,136.0 305.4,134.4 306.0,132.5 C306.6,130.6 307.5,129.0 308.0,129.0 C308.5,129.0 309.4,127.4 310.0,125.5 C310.6,123.6 311.5,122.0 312.0,122.0 C312.4,122.0 313.3,120.7 313.8,119.0 L314.9,116.0L310.1,118.8 C307.5,120.3 279.2,136.6 247.2,155.0 L189.0,188.5L189.0,261.9 C189.0,302.3 189.2,335.1 189.4,334.9 C189.6,334.7 204.1,309.8 221.5,279.6 Z M71.3,245.8 C89.6,235.3 120.0,217.7 139.0,206.8 C158.0,195.8 173.8,186.6 174.2,186.2 C174.6,185.8 145.6,168.6 109.8,148.0 C73.9,127.4 43.8,109.7 42.8,108.8 C40.7,106.7 40.3,99.4 42.2,98.7 C43.0,98.4 43.0,98.1 42.4,98.1 C41.8,98.0 40.5,98.9 39.4,100.1 C37.6,102.1 37.5,105.2 37.2,183.6 C37.1,228.4 37.2,265.0 37.6,265.0 C37.9,265.0 53.1,256.4 71.3,245.8 Z M334.0,184.5 L334.0,104.0L331.2,101.1 C328.7,98.3 187.3,16.0 185.0,16.0 C184.5,16.0 152.6,34.1 114.3,56.2 C45.3,96.1 44.6,96.5 48.6,97.2 C55.0,98.3 182.0,98.2 182.0,97.0 C182.0,96.5 183.6,96.0 185.5,96.0 C187.4,96.0 189.0,96.5 189.0,97.0 C189.0,97.7 212.6,98.0 257.7,98.0 C335.9,98.0 330.0,97.3 330.0,106.5 C330.0,111.0 327.9,117.5 326.0,119.0 C324.9,119.9 316.0,135.9 316.0,137.0 C316.0,137.5 315.6,138.0 315.1,138.0 C314.6,138.0 313.6,139.6 313.0,141.5 C312.4,143.4 311.5,145.0 311.0,145.0 C310.5,145.0 309.8,146.0 309.4,147.2 C309.1,148.5 308.2,150.2 307.5,151.0 C306.8,151.8 305.0,155.0 303.4,158.0 C301.8,161.0 300.0,164.1 299.3,164.8 C298.6,165.5 298.0,166.7 298.0,167.4 C298.0,168.1 297.1,169.7 296.0,171.0 C294.9,172.3 294.0,173.8 294.0,174.3 C294.0,174.9 293.4,176.1 292.6,176.9 C291.8,177.8 290.0,181.0 288.4,184.0 C286.8,187.0 285.0,190.1 284.3,190.8 C283.6,191.5 282.7,193.2 282.4,194.6 C282.1,195.9 281.4,197.0 281.0,197.0 C280.5,197.0 279.8,197.9 279.5,199.0 C279.1,200.1 277.3,203.4 275.4,206.3 C273.5,209.1 272.0,212.0 272.0,212.7 C272.0,213.3 271.4,214.5 270.7,215.2 C270.0,215.9 268.3,218.5 266.8,221.0 L264.2,225.4L288.4,239.3 C301.6,246.9 317.0,255.8 322.5,259.1 C328.0,262.3 332.8,264.9 333.2,265.0 C333.7,265.0 334.0,228.8 334.0,184.5 Z M250.0,142.5 L312.3,106.5L249.2,106.2 C214.5,106.1 157.5,106.1 122.6,106.2 L58.9,106.5L122.2,143.1 C157.0,163.2 186.0,179.4 186.6,179.1 C187.2,178.8 215.7,162.3 250.0,142.5 Z", 370]};
async function buildComponents() {
  const errors = [], made = [];
  const step = async (name, fn) => { try { await fn(); made.push(name); } catch (e) { errors.push(name + ': ' + e.message); console.error(name, e); } };
  try {
    // ---------------- Fonts
    const avail = await figma.listAvailableFontsAsync();
    const has = (fam, st) => avail.some(f => f.fontName.family === fam && f.fontName.style === st);
    if (!has('IBM Plex Sans', 'Regular')) throw new Error('IBM Plex Sans is not installed. Install IBM Plex Sans and IBM Plex Mono, then run again.');
    const F = { reg: { family: 'IBM Plex Sans', style: 'Regular' }, med: { family: 'IBM Plex Sans', style: 'Medium' }, semi: { family: 'IBM Plex Sans', style: has('IBM Plex Sans', 'SemiBold') ? 'SemiBold' : 'Semi Bold' }, mono: { family: 'IBM Plex Mono', style: 'Regular' } };
    for (const f of Object.values(F)) await figma.loadFontAsync(f);

    // ---------------- Tokens (found by name)
    const colls = await figma.variables.getLocalVariableCollectionsAsync();
    const allVars = await figma.variables.getLocalVariablesAsync();
    const light = colls.find(c => c.name === 'Color / Light');
    if (!light) throw new Error('Variables group “Color / Light” not found in this file.');
    const cv = n => { const v = allVars.find(x => x.variableCollectionId === light.id && x.name === n); if (!v) throw new Error('Missing colour variable ' + n); return v; };
    const fv = n => allVars.find(x => x.name === n && x.resolvedType === 'FLOAT');
    const C = { bg: cv('bg/primary'), ink: cv('text/primary'), t2: cv('text/secondary'), pbg: cv('button/primary/bg'), ptx: cv('button/primary/text'), hair: cv('border/hairline'),
      lowf: cv('risk/low/fg'), lowb: cv('risk/low/bg'), medf: cv('risk/medium/fg'), medb: cv('risk/medium/bg'), highf: cv('risk/high/fg'), highb: cv('risk/high/bg'), wf: cv('status/working/fg'), wb: cv('status/working/bg') };
    const RAD = { code: fv('radius/code'), field: fv('radius/stat-field'), card: fv('radius/card'), tab: fv('radius/tab-bar'), sheet: fv('radius/sheet'), pill: fv('radius/pill') };
    const tsAll = await figma.getLocalTextStylesAsync();
    const ensureTS = (name, font, size, lh) => { let s = tsAll.find(x => x.name === 'Nudge/' + name); if (!s) { s = figma.createTextStyle(); s.name = 'Nudge/' + name; s.fontName = font; s.fontSize = size; s.lineHeight = { unit: 'PERCENT', value: lh }; tsAll.push(s); } return s.id; };
    const TS = { large: ensureTS('Large title', F.semi, 34, 110), title2: ensureTS('Title 2', F.semi, 22, 125), title3: ensureTS('Title 3', F.semi, 20, 120), headline: ensureTS('Headline', F.semi, 17, 130), body: ensureTS('Body', F.reg, 17, 145), callout: ensureTS('Callout bold', F.semi, 16, 125), subBold: ensureTS('Subhead bold', F.semi, 15, 120), sub: ensureTS('Subhead', F.reg, 15, 140), foot: ensureTS('Footnote', F.reg, 13, 135), footBold: ensureTS('Footnote bold', F.semi, 13, 125), tab: ensureTS('Tab label', F.med, 10, 120), stat: ensureTS('Stat number', F.semi, 28, 100), cmd: ensureTS('Mono command', F.mono, 15, 135), proj: ensureTS('Mono project', F.mono, 14, 120), time: ensureTS('Mono time', F.mono, 13, 120) };
    const fxAll = await figma.getLocalEffectStylesAsync();
    const fxId = n => (fxAll.find(s => s.name === n) || {}).id;
    const FX = { card: fxId('Glass/Card · Light'), btn: fxId('Glass/Button · Light') };
    if (!FX.card || !FX.btn) throw new Error('Effect styles “Glass/Card · Light” and “Glass/Button · Light” not found.');

    // ---------------- Helpers
    const paint = (va, op) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: op === undefined ? 1 : op }, 'color', va);
    const fill = (n, va, op) => { n.fills = [paint(va, op)]; };
    const stroke = (n, va, w) => { n.strokes = [paint(va)]; n.strokeWeight = w || 1; n.strokeAlign = 'INSIDE'; };
    const radius = (n, va, fallback) => { if (va) { for (const k of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) n.setBoundVariable(k, va); } else n.cornerRadius = fallback; };
    const glass = async (n, kind) => { n.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: kind === 'card' ? 0.62 : 0.58 }]; await n.setEffectStyleIdAsync(kind === 'card' ? FX.card : FX.btn); };
    const fieldFill = n => { n.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 0.7 }]; stroke(n, C.hair, 1); };
    async function T(chars, style, va, name) { const t = figma.createText(); t.fontName = F.reg; t.characters = chars; await t.setTextStyleIdAsync(style); fill(t, va); if (name) t.name = name; return t; }
    function AL(dir, o) { const f = figma.createFrame(); f.layoutMode = dir; f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'; f.fills = []; f.clipsContent = false; if (o) for (const k in o) f[k] = o[k]; return f; }
    function COMP(name, dir, o) { const c = figma.createComponent(); c.name = name; c.fills = []; c.clipsContent = false; if (dir) { c.layoutMode = dir; } if (o) for (const k in o) c[k] = o[k]; return c; }
    const prop = (c, n, type, def) => c.addComponentProperty(n, type, def);
    const tint = (inst, va) => { for (const n of inst.findAll(x => 'strokes' in x && x.strokes.length && x.type !== 'INSTANCE' && x.type !== 'FRAME')) { const w = n.strokeWeight; n.strokes = [paint(va)]; n.strokeWeight = w; } };
    const setP = (inst, name, val) => { const k = Object.keys(inst.componentProperties).find(x => x.startsWith(name + '#')); if (k) inst.setProperties({ [k]: val }); };
    function grid(set, cols, gx, gy) { let x = 24, y = 24, rh = 0; set.children.forEach((ch, i) => { if (i && i % cols === 0) { x = 24; y += rh + gy; rh = 0; } ch.x = x; ch.y = y; x += ch.width + gx; rh = Math.max(rh, ch.height); }); let mx = 0, my = 0; for (const ch of set.children) { mx = Math.max(mx, ch.x + ch.width); my = Math.max(my, ch.y + ch.height); } set.resizeWithoutConstraints(mx + 24, my + 24); }
    const V = (set, props) => set.children.find(c => { const v = Object.fromEntries(c.name.split(', ').map(x => x.split('='))); return Object.entries(props).every(([k, val]) => v[k] === val); });

    // ---------------- Where to put everything
    let page = null;
    try { page = figma.createPage(); page.name = 'Components'; } catch (e) { page = figma.currentPage; }
    await figma.setCurrentPageAsync(page);
    let startX = 0; for (const n of page.children) startX = Math.max(startX, n.x + n.width + 400);
    const groups = {};
    const group = (title) => { if (groups[title]) return groups[title]; const s = figma.createSection(); s.name = title; page.appendChild(s); s.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; groups[title] = { s, x: 80, y: 120, rowH: 0 }; return groups[title]; };
    const place = (title, node, newRow) => { const g = group(title); g.s.appendChild(node); if (newRow || g.x + node.width > 1700) { g.x = 80; g.y += g.rowH + 80; g.rowH = 0; } node.x = g.x; node.y = g.y; g.x += node.width + 80; g.rowH = Math.max(g.rowH, node.height); };
    const K = {};

    // ================= 1. Icons
    await step('Icons', async () => {
      const P = { home: '<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>', 'home-filled': '__HOMEF__', plus: '<path d="M12 5v14M5 12h14"/>', computer: '<rect x="4" y="5" width="16" height="11" rx="2"/><path d="M2 19h20"/>', settings: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>', back: '<path d="M15 5l-7 7 7 7"/>', chevron: '<path d="M9 5l7 7-7 7"/>', 'chevron-down': '<path d="M6 9l6 6 6-6"/>', fingerprint: '<path d="M8 11a4 4 0 0 1 8 0v3M12 11v6M6 9a6 6 0 0 1 12 0M10 14v4"/>', mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>', send: '<path d="M5 12h13M13 6l6 6-6 6"/>', shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>', alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/>', warning: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>', spinner: '<path d="M12 4a8 8 0 1 0 8 8"/>', check: '<path d="M5 12l5 5 9-10"/>', close: '<path d="M7 7l10 10M17 7 7 17"/>', hourglass: '<path d="M7 4h10M7 20h10M8 4c0 5 8 6 8 8s-8 3-8 8M16 4c0 5-8 6-8 8"/>', eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', 'eye-off': '<path d="M3 3l18 18M10.6 5.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.8 8.3 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>', pause: '<path d="M9 6v12M15 6v12"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>', folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', phone: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>', refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5"/>', stop: '<rect x="7" y="7" width="10" height="10" rx="2"/>', undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>', qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v7h-4M14 21v-3"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>', moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>', file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>', terminal: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10l3 2-3 2M12 15h5"/>', search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>' };
      const row = AL('HORIZONTAL', { name: 'Icons', itemSpacing: 24 }); row.layoutWrap = 'WRAP'; row.counterAxisSpacing = 24; row.resize(760, 100); row.primaryAxisSizingMode = 'FIXED';
      for (const [n, p] of Object.entries(P)) {
        const svg = n === 'home-filled' ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 3.2 3 11v10h7v-6h4v6h7V11z" fill="#0A0A0A"/></svg>` : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
        const node = figma.createNodeFromSvg(svg); const c = figma.createComponentFromNode(node); c.name = 'Icon/' + n; c.fills = [];
        c.description = n === 'home-filled' ? 'Active Home tab.' : 'Line icon · 24 · 1.75 stroke, rounded.';
        row.appendChild(c); K['icon:' + n] = c;
      }
      place('Foundations · icons and logos', row, true);
    });
    const icon = n => K['icon:' + n];

    // ================= 2. Logos (Nudge, app icons, agents, Google)
    await step('Logos', async () => {
      const row = AL('HORIZONTAL', { name: 'Logos', itemSpacing: 40, counterAxisAlignItems: 'CENTER' });
      const add = (name, svg, size, desc) => { const n = figma.createNodeFromSvg(svg); if (n.width) n.rescale(size / n.width); const c = figma.createComponentFromNode(n); c.name = name; c.fills = []; c.description = desc; row.appendChild(c); K[name] = c; };
      const ring = (col, w) => `<circle cx="50" cy="50" r="34" fill="none" stroke="${col}" stroke-width="${w}" stroke-dasharray="180 33.6" transform="rotate(112 50 50)" stroke-linecap="round"/><circle cx="50" cy="50" r="21" fill="none" stroke="${col}" stroke-width="${w}"/><circle cx="50" cy="50" r="9" fill="${col}"/>`;
      add('Logo/Nudge mark', `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">${ring('#0A0A0A', 7)}</svg>`, 40, 'In-app mark. Black on light; white on dark. Never add colour or the old small dot.');
      add('Logo/Nudge mark · White', `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">${ring('#F5F5F7', 7)}</svg>`, 40, 'In-app mark on dark backgrounds.');
      add('Logo/App icon · Dark', `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="22.37" fill="#0A0A0A"/><g transform="translate(14 14) scale(0.72)">${ring('#FFFFFF', 6)}</g></svg>`, 120, 'Primary app icon.');
      add('Logo/App icon · Light', `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="22.37" fill="#FFFFFF"/><g transform="translate(14 14) scale(0.72)">${ring('#0A0A0A', 6)}</g></svg>`, 120, 'Light app icon.');
      for (const [k, name, col] of [['claude', 'Claude', '#D97757'], ['codex', 'Codex', '#0A0A0A'], ['cursor', 'Cursor', '#0A0A0A']]) {
        const [p, s] = AGENT[k]; add('Agent/' + name, `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}"><path d="${p}" fill="${col}" fill-rule="evenodd"/></svg>`, 18, 'Traced for mockups. Use the official logo when shipping.');
      }
      const img = figma.createImage(figma.base64Decode(GOOGLE_PNG));
      const g = figma.createComponent(); g.name = 'Brand/Google'; g.resize(20, 20); g.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FIT' }];
      g.description = 'Your uploaded file is 16×16 px, so it looks soft at 20px. Replace with the official vector from Google’s brand resources.'; row.appendChild(g); K['Brand/Google'] = g;
      place('Foundations · icons and logos', row, true);
    });

    // ================= 3. Button
    await step('Button', async () => {
      const comps = [];
      const combos = [];
      for (const style of ['Primary', 'Glass', 'Destructive']) for (const size of ['Medium', 'Large']) for (const state of ['Default', 'Pressed', 'Disabled']) combos.push([style, size, state]);
      for (const state of ['Default', 'Disabled']) combos.push(['Text', 'Medium', state]);
      combos.push(['Hold', 'Large', 'Default']);
      for (const [style, size, state] of combos) {
        const h = size === 'Large' ? 56 : 44;
        const c = COMP(`Style=${style}, Size=${size}, State=${state}`, 'HORIZONTAL', { primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER', itemSpacing: 8 });
        c.resize(120, h); c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED';
        c.paddingLeft = c.paddingRight = style === 'Text' ? 4 : (size === 'Large' ? 24 : 18);
        radius(c, RAD.pill, h / 2);
        let labelVar = C.ink;
        if (style === 'Primary' || style === 'Hold') { fill(c, C.pbg, state === 'Pressed' ? 0.82 : 1); labelVar = C.ptx; }
        if (style === 'Destructive') { fill(c, C.highf, state === 'Pressed' ? 0.85 : 1); labelVar = C.ptx; }
        if (style === 'Glass') { if (state === 'Pressed') { c.fills = [{ type: 'SOLID', color: { r: 0.92, g: 0.92, b: 0.92 } }]; } else await glass(c, 'btn'); }
        if (state === 'Disabled' && style !== 'Text') { c.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }]; c.effects = []; labelVar = C.t2; }
        if (style === 'Text' && state === 'Disabled') labelVar = C.t2;
        if (style === 'Hold') { c.clipsContent = true; const p = figma.createRectangle(); p.name = 'Hold progress'; c.appendChild(p); p.layoutPositioning = 'ABSOLUTE'; p.x = 0; p.y = 0; p.resize(80, h); p.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 0.22 }]; }
        const showIcon = prop(c, 'Show icon', 'BOOLEAN', style === 'Hold');
        const iconP = prop(c, 'Icon', 'INSTANCE_SWAP', icon('fingerprint').id);
        const label = prop(c, 'Label', 'TEXT', style === 'Hold' ? 'Hold to approve' : style === 'Destructive' ? 'Sign out' : style === 'Text' ? 'Forgot password?' : 'Approve');
        const ic = icon('fingerprint').createInstance(); c.appendChild(ic); ic.resize(size === 'Large' ? 20 : 18, size === 'Large' ? 20 : 18); tint(ic, labelVar);
        ic.componentPropertyReferences = { visible: showIcon, mainComponent: iconP };
        const t = await T(style === 'Hold' ? 'Hold to approve' : style === 'Destructive' ? 'Sign out' : style === 'Text' ? 'Forgot password?' : 'Approve', size === 'Large' ? TS.headline : TS.callout, labelVar, 'Label');
        if (style === 'Text') t.textDecoration = 'UNDERLINE';
        c.appendChild(t); t.componentPropertyReferences = { characters: label };
        comps.push(c);
      }
      const s = figma.combineAsVariants(comps, page); s.name = 'Button';
      s.description = 'Full pill. Primary = solid ink (Approve, Send). Glass = secondary (Deny, Answer later). Destructive = Sign out, Remove phone. Text = links. Hold = high-risk approve. Medium 44 (in cards), Large 56 (bottom bars). Min touch target 44.';
      const cols = ['Default', 'Pressed', 'Disabled'];
      const rows = ['Primary|Medium', 'Primary|Large', 'Glass|Medium', 'Glass|Large', 'Destructive|Medium', 'Destructive|Large', 'Text|Medium', 'Hold|Large'];
      for (const ch of s.children) { const p = Object.fromEntries(ch.name.split(', ').map(x => x.split('='))); ch.x = 24 + cols.indexOf(p.State) * 240; ch.y = 24 + rows.indexOf(p.Style + '|' + p.Size) * 80; }
      let mx = 0, my = 0; for (const ch of s.children) { mx = Math.max(mx, ch.x + ch.width); my = Math.max(my, ch.y + ch.height); } s.resizeWithoutConstraints(mx + 24, my + 24);
      K.Button = s; place('Buttons and actions', s, true);
    });

    // ================= 4. Icon button, provider button, divider
    await step('Icon button', async () => {
      const comps = [];
      for (const st of ['Default', 'Pressed']) { const c = COMP('State=' + st, 'HORIZONTAL', { primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' }); c.resize(44, 44); c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'FIXED'; c.cornerRadius = 22;
        if (st === 'Default') await glass(c, 'btn'); else c.fills = [{ type: 'SOLID', color: { r: 0.92, g: 0.92, b: 0.92 } }];
        const p = prop(c, 'Icon', 'INSTANCE_SWAP', icon('settings').id); const i = icon('settings').createInstance(); c.appendChild(i); i.resize(20, 20); tint(i, C.ink); i.componentPropertyReferences = { mainComponent: p }; comps.push(c); }
      const s = figma.combineAsVariants(comps, page); s.name = 'Icon button'; s.description = '44×44 glass circle (Settings, Back).'; grid(s, 2, 24, 24); K.IconButton = s; place('Buttons and actions', s);
    });
    await step('Sign-in provider button', async () => {
      const c = COMP('Sign-in provider button', 'HORIZONTAL', { primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER', itemSpacing: 10 }); c.resize(358, 56); c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'FIXED'; radius(c, RAD.pill, 28); await glass(c, 'btn');
      const g = K['Brand/Google'].createInstance(); c.appendChild(g); g.resize(20, 20);
      const t = await T('Continue with Google', TS.headline, C.ink, 'Label'); c.appendChild(t); t.componentPropertyReferences = { characters: prop(c, 'Label', 'TEXT', 'Continue with Google') };
      c.description = 'Glass, full width, Google logo + label.'; place('Buttons and actions', c);
    });
    await step('Divider · or', async () => {
      const c = COMP('Divider · or', 'HORIZONTAL', { counterAxisAlignItems: 'CENTER', itemSpacing: 12 }); c.resize(358, 20); c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'AUTO';
      for (const i of [0, 1, 2]) { if (i === 1) { c.appendChild(await T('or', TS.foot, C.t2)); continue; } const l = figma.createRectangle(); l.name = 'Line'; c.appendChild(l); l.resize(100, 1); fill(l, C.hair); l.layoutGrow = 1; }
      place('Buttons and actions', c);
    });

    // ================= 5. Chips
    await step('Chip', async () => {
      const defs = [['Low risk', 'shield', C.lowf, C.lowb], ['Medium risk', 'alert', C.medf, C.medb], ['High risk', 'warning', C.highf, C.highb], ['Working', 'spinner', C.wf, C.wb], ['Paused', 'pause', C.wf, C.wb], ['Stopped', 'stop', C.wf, C.wb], ['Done', 'check', C.lowf, C.lowb], ['Approved', 'check', C.lowf, C.lowb], ['Connected', 'check', C.lowf, C.lowb], ['Failed', 'close', C.highf, C.highb]];
      const comps = [];
      for (const [label, ic, fg, bgv] of defs) { const c = COMP('Kind=' + label, 'HORIZONTAL', { counterAxisAlignItems: 'CENTER', itemSpacing: 5 }); c.resize(80, 28); c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'; c.paddingLeft = 10; c.paddingRight = 12; radius(c, RAD.pill, 14); fill(c, bgv);
        const i = icon(ic).createInstance(); c.appendChild(i); i.resize(14, 14); tint(i, fg); c.appendChild(await T(label, TS.footBold, fg, 'Label')); comps.push(c); }
      const s = figma.combineAsVariants(comps, page); s.name = 'Chip'; s.description = 'Status and risk. Always icon + word + colour (never colour alone). Not tappable.'; grid(s, 5, 16, 16); K.Chip = s; place('Status', s, true);
    });

    // ================= 6. Inputs
    await step('Text field', async () => {
      const comps = [];
      for (const type of ['Text', 'Password']) for (const st of ['Default', 'Focused', 'Filled', 'Error', 'Disabled']) {
        const c = COMP(`Type=${type}, State=${st}`, 'VERTICAL', { itemSpacing: 6 }); c.resize(358, 80); c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED';
        const pL = prop(c, 'Label', 'TEXT', type === 'Password' ? 'Password' : 'Email'), pV = prop(c, 'Value', 'TEXT', type === 'Password' ? '••••••••' : 'you@email.com'), pM = prop(c, 'Message', 'TEXT', 'Wrong email or password.');
        const lab = await T(type === 'Password' ? 'Password' : 'Email', TS.footBold, C.ink, 'Label'); c.appendChild(lab); lab.componentPropertyReferences = { characters: pL };
        const f = AL('HORIZONTAL', { name: 'Field', counterAxisAlignItems: 'CENTER', itemSpacing: 4 }); c.appendChild(f); f.resize(358, 48); f.counterAxisSizingMode = 'FIXED'; f.layoutSizingHorizontal = 'FILL'; f.paddingLeft = 16; f.paddingRight = type === 'Password' ? 2 : 16; radius(f, RAD.field, 24); fieldFill(f);
        if (st === 'Focused') stroke(f, C.ink, 1.5); if (st === 'Error') stroke(f, C.highf, 1.5);
        const filled = ['Focused', 'Filled', 'Error'].includes(st);
        const v = await T(filled ? (type === 'Password' ? '••••••••' : 'you@email.com') : (type === 'Password' ? 'Password' : 'you@email.com'), TS.body, filled ? C.ink : C.t2, 'Value'); f.appendChild(v); v.layoutSizingHorizontal = 'FILL'; if (filled) v.componentPropertyReferences = { characters: pV };
        if (type === 'Password') { const b = AL('HORIZONTAL', { name: 'Show password', primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' }); f.appendChild(b); b.resize(44, 44); b.primaryAxisSizingMode = 'FIXED'; b.counterAxisSizingMode = 'FIXED'; const e = icon('eye').createInstance(); b.appendChild(e); e.resize(20, 20); tint(e, C.t2); }
        const m = await T('Wrong email or password.', TS.foot, C.highf, 'Error message'); c.appendChild(m); m.componentPropertyReferences = { characters: pM }; m.visible = st === 'Error';
        if (st === 'Disabled') c.opacity = 0.5;
        comps.push(c); }
      const s = figma.combineAsVariants(comps, page); s.name = 'Text field'; s.description = 'Label above, 48-tall field, red message below on error. Password has a 44×44 show/hide button.'; grid(s, 5, 24, 24); place('Inputs', s, true);
    });
    await step('Input', async () => {
      const comps = [];
      for (const st of ['Empty', 'Focused', 'Typed']) { const c = COMP('State=' + st, 'HORIZONTAL', { counterAxisAlignItems: 'CENTER', itemSpacing: 4 }); c.resize(326, 48); c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'FIXED'; c.paddingLeft = 16; c.paddingRight = 4; radius(c, RAD.field, 24); fieldFill(c); if (st !== 'Empty') stroke(c, C.ink, 1.5);
        const tp = prop(c, 'Text', 'TEXT', st === 'Typed' ? 'Use email and password' : 'Or write your own answer');
        const t = await T(st === 'Typed' ? 'Use email and password' : 'Or write your own answer', TS.body, st === 'Typed' ? C.ink : C.t2, 'Text'); c.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.componentPropertyReferences = { characters: tp };
        const mic = AL('HORIZONTAL', { name: 'Mic', primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' }); c.appendChild(mic); mic.resize(44, 44); mic.primaryAxisSizingMode = 'FIXED'; mic.counterAxisSizingMode = 'FIXED'; const mi = icon('mic').createInstance(); mic.appendChild(mi); mi.resize(20, 20); tint(mi, C.t2);
        if (st === 'Typed') { const sb = AL('HORIZONTAL', { name: 'Send', primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' }); c.appendChild(sb); sb.resize(40, 40); sb.primaryAxisSizingMode = 'FIXED'; sb.counterAxisSizingMode = 'FIXED'; sb.cornerRadius = 20; fill(sb, C.pbg); const si = icon('send').createInstance(); sb.appendChild(si); si.resize(18, 18); tint(si, C.ptx); }
        comps.push(c); }
      const s = figma.combineAsVariants(comps, page); s.name = 'Input'; s.description = 'Answer field with mic; send appears once there is text.'; grid(s, 1, 0, 16); K.Input = s; place('Inputs', s);
    });
    await step('Search field', async () => {
      const comps = [];
      for (const st of ['Empty', 'Filled']) { const c = COMP('State=' + st, 'HORIZONTAL', { counterAxisAlignItems: 'CENTER', itemSpacing: 8 }); c.resize(358, 44); c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'FIXED'; c.paddingLeft = 14; c.paddingRight = 14; radius(c, RAD.pill, 22); fieldFill(c);
        const i = icon('search').createInstance(); c.appendChild(i); i.resize(18, 18); tint(i, C.t2);
        const t = await T(st === 'Empty' ? 'Search projects' : 'portfolio', TS.body, st === 'Empty' ? C.t2 : C.ink, 'Text'); c.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.componentPropertyReferences = { characters: prop(c, 'Text', 'TEXT', st === 'Empty' ? 'Search projects' : 'portfolio') }; comps.push(c); }
      const s = figma.combineAsVariants(comps, page); s.name = 'Search field'; grid(s, 1, 0, 16); place('Inputs', s);
    });
    await step('Code input', async () => {
      const cells = [];
      for (const st of ['Empty', 'Active', 'Filled', 'Error']) { const c = COMP('State=' + st, 'HORIZONTAL', { primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' }); c.resize(48, 56); c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'FIXED'; c.cornerRadius = 14; fieldFill(c); if (st === 'Active') stroke(c, C.ink, 1.5); if (st === 'Error') stroke(c, C.highf, 1.5);
        const t = await T(st === 'Empty' || st === 'Active' ? ' ' : '4', TS.title2, C.ink, 'Digit'); t.fontName = F.mono; c.appendChild(t); t.componentPropertyReferences = { characters: prop(c, 'Digit', 'TEXT', '4') }; cells.push(c); }
      const cs = figma.combineAsVariants(cells, page); cs.name = 'Code cell'; grid(cs, 4, 12, 12); place('Inputs', cs, true);
      const comps = [];
      for (const st of ['Default', 'Error']) { const c = COMP('State=' + st, 'VERTICAL', { itemSpacing: 10 }); c.resize(358, 60); c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED';
        const r = AL('HORIZONTAL', { name: 'Digits', itemSpacing: 8 }); c.appendChild(r);
        for (let i = 0; i < 6; i++) r.appendChild(V(cs, { State: st === 'Error' ? 'Error' : (i < 3 ? 'Filled' : i === 3 ? 'Active' : 'Empty') }).createInstance());
        const m = await T('This code has expired. Use the new code on your computer.', TS.foot, C.highf, 'Error message'); c.appendChild(m); m.layoutSizingHorizontal = 'FILL'; m.visible = st === 'Error'; m.componentPropertyReferences = { characters: prop(c, 'Message', 'TEXT', 'This code has expired. Use the new code on your computer.') };
        comps.push(c); }
      const s = figma.combineAsVariants(comps, page); s.name = 'Code input'; s.description = '6-digit pairing code in mono digits.'; grid(s, 1, 0, 24); place('Inputs', s);
    });
    await step('Answer option', async () => {
      const comps = [];
      for (const st of ['Default', 'Selected']) { const c = COMP('State=' + st, 'HORIZONTAL', { counterAxisAlignItems: 'CENTER', itemSpacing: 12 }); c.resize(326, 48); c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'AUTO'; c.minHeight = 48; c.paddingLeft = 12; c.paddingRight = 16; c.paddingTop = c.paddingBottom = 11; radius(c, RAD.field, 24); fieldFill(c); if (st === 'Selected') stroke(c, C.ink, 1.5);
        const n = AL('HORIZONTAL', { name: 'Number', primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' }); c.appendChild(n); n.resize(26, 26); n.primaryAxisSizingMode = 'FIXED'; n.counterAxisSizingMode = 'FIXED'; n.cornerRadius = 13; if (st === 'Selected') fill(n, C.ink); else { fill(n, C.bg); stroke(n, C.hair, 1); }
        const nt = await T('1', TS.time, st === 'Selected' ? C.bg : C.ink, 'Number'); n.appendChild(nt); nt.componentPropertyReferences = { characters: prop(c, 'Number', 'TEXT', '1') };
        const l = await T('Email and password', TS.body, C.ink, 'Label'); c.appendChild(l); l.layoutSizingHorizontal = 'FILL'; l.componentPropertyReferences = { characters: prop(c, 'Label', 'TEXT', 'Email and password') }; comps.push(c); }
      const s = figma.combineAsVariants(comps, page); s.name = 'Answer option'; s.description = 'Numbered answers, top to bottom; the Input always comes last.'; grid(s, 1, 0, 16); K.AnswerOption = s; place('Inputs', s, true);
    });
    await step('Option row', async () => {
      const comps = [];
      for (const st of ['Default', 'Selected', 'Disabled']) { const c = COMP('State=' + st, 'HORIZONTAL', { counterAxisAlignItems: 'CENTER', itemSpacing: 12 }); c.resize(358, 60); c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'AUTO'; c.minHeight = 56; c.paddingLeft = c.paddingRight = 16; c.paddingTop = c.paddingBottom = 12; c.cornerRadius = 20; fieldFill(c); if (st === 'Selected') stroke(c, C.ink, 1.5); if (st === 'Disabled') c.opacity = 0.5;
        const lead = K['Agent/Claude'].createInstance(); c.appendChild(lead); lead.resize(20, 20); lead.componentPropertyReferences = { visible: prop(c, 'Show logo', 'BOOLEAN', false), mainComponent: prop(c, 'Logo', 'INSTANCE_SWAP', K['Agent/Claude'].id) };
        const col = AL('VERTICAL', { name: 'Text', itemSpacing: 2 }); c.appendChild(col); col.layoutSizingHorizontal = 'FILL';
        const a = await T('Ask me before every action', TS.headline, C.ink, 'Title'); col.appendChild(a); a.componentPropertyReferences = { characters: prop(c, 'Title', 'TEXT', 'Ask me before every action') };
        const b = await T('Safest when you’re away', TS.sub, C.t2, 'Description'); col.appendChild(b); b.componentPropertyReferences = { characters: prop(c, 'Description', 'TEXT', 'Safest when you’re away'), visible: prop(c, 'Show description', 'BOOLEAN', true) };
        const r = figma.createEllipse(); r.name = 'Radio'; r.resize(22, 22); r.fills = []; stroke(r, st === 'Selected' ? C.ink : C.hair, st === 'Selected' ? 7 : 1.5); c.appendChild(r); comps.push(c); }
      const s = figma.combineAsVariants(comps, page); s.name = 'Option row'; s.description = 'Single choice in pickers (time to answer, safety, model, intensity, computer, agent).'; grid(s, 1, 0, 16); K.OptionRow = s; place('Inputs', s);
    });
    await step('Form field', async () => {
      const comps = [];
      for (const st of ['Default', 'Placeholder', 'With note', 'Disabled']) { const c = COMP('State=' + st, 'VERTICAL', { itemSpacing: 6 }); c.resize(358, 80); c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'; if (st === 'Disabled') c.opacity = 0.5;
        const l = await T('Agent', TS.footBold, C.ink, 'Label'); c.appendChild(l); l.componentPropertyReferences = { characters: prop(c, 'Label', 'TEXT', 'Agent') };
        const f = AL('HORIZONTAL', { name: 'Field', counterAxisAlignItems: 'CENTER', itemSpacing: 8 }); c.appendChild(f); f.resize(358, 52); f.counterAxisSizingMode = 'FIXED'; f.layoutSizingHorizontal = 'FILL'; f.paddingLeft = 16; f.paddingRight = 12; f.cornerRadius = 20; fieldFill(f);
        const v = await T(st === 'Placeholder' ? 'Choose a folder' : 'Claude Code', TS.body, st === 'Placeholder' ? C.t2 : C.ink, 'Value'); f.appendChild(v); v.layoutSizingHorizontal = 'FILL'; v.componentPropertyReferences = { characters: prop(c, 'Value', 'TEXT', 'Claude Code') };
        const ch = icon('chevron').createInstance(); f.appendChild(ch); ch.resize(18, 18); tint(ch, C.t2);
        const n = await T('Cursor can’t start tasks from the phone', TS.foot, C.t2, 'Note'); c.appendChild(n); n.visible = st === 'With note'; n.componentPropertyReferences = { characters: prop(c, 'Note', 'TEXT', 'Cursor can’t start tasks from the phone') }; comps.push(c); }
      const s = figma.combineAsVariants(comps, page); s.name = 'Form field'; s.description = 'Tappable field that opens a picker (New task).'; grid(s, 4, 24, 24); place('Inputs', s, true);
    });
    await step('Toggle', async () => {
      const comps = [];
      for (const st of ['On', 'Off', 'Disabled']) { const c = COMP('State=' + st); c.resize(51, 31); c.cornerRadius = 15.5; if (st === 'On') fill(c, C.pbg); else c.fills = [{ type: 'SOLID', color: { r: 0.47, g: 0.47, b: 0.5 }, opacity: 0.24 }]; if (st === 'Disabled') c.opacity = 0.5;
        const k = figma.createEllipse(); k.name = 'Knob'; k.resize(27, 27); k.x = st === 'On' ? 22 : 2; k.y = 2; k.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; k.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.15 }, offset: { x: 0, y: 3 }, radius: 8, spread: 0, visible: true, blendMode: 'NORMAL', showShadowBehindNode: false }]; c.appendChild(k); comps.push(c); }
      const s = figma.combineAsVariants(comps, page); s.name = 'Toggle'; s.description = 'iOS switch, 51×31 (its tap area is the whole row, ≥ 52 tall).'; grid(s, 3, 24, 24); K.Toggle = s; place('Inputs', s);
    });

    // ================= 7. Lists, rows, menus
    await step('List row', async () => {
      const comps = [];
      for (const type of ['Navigation', 'Value', 'Toggle', 'Two-line', 'Action', 'Destructive']) {
        const c = COMP('Type=' + type, 'HORIZONTAL', { counterAxisAlignItems: 'CENTER', itemSpacing: 12 }); c.resize(358, 52); c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'AUTO'; c.minHeight = 52; c.paddingLeft = c.paddingRight = 16; c.paddingTop = c.paddingBottom = 12;
        const lead = icon('file').createInstance(); c.appendChild(lead); lead.resize(20, 20); tint(lead, C.t2); lead.componentPropertyReferences = { visible: prop(c, 'Show leading icon', 'BOOLEAN', false), mainComponent: prop(c, 'Leading icon', 'INSTANCE_SWAP', icon('file').id) };
        const col = AL('VERTICAL', { name: 'Text', itemSpacing: 2 }); c.appendChild(col); col.layoutSizingHorizontal = 'FILL';
        const titles = { Navigation: 'Time to answer', Value: 'Model', Toggle: 'AI explanation', 'Two-line': 'my-app', Action: 'Old Android', Destructive: 'Sign out' };
        const t = await T(titles[type], TS.body, type === 'Destructive' ? C.highf : C.ink, 'Title'); col.appendChild(t); t.componentPropertyReferences = { characters: prop(c, 'Title', 'TEXT', titles[type]) };
        if (type === 'Two-line' || type === 'Action') { const s2 = await T(type === 'Two-line' ? 'C:\\Users\\you\\projects\\my-app' : 'Last used yesterday', TS.sub, C.t2, 'Subtitle'); col.appendChild(s2); s2.componentPropertyReferences = { characters: prop(c, 'Subtitle', 'TEXT', 'Subtitle') }; }
        if (type === 'Navigation' || type === 'Value') { const v = await T(type === 'Value' ? 'Set in Cursor' : '10 min', TS.body, C.t2, 'Value'); c.appendChild(v); v.componentPropertyReferences = { characters: prop(c, 'Value', 'TEXT', '10 min') }; }
        if (type === 'Navigation' || type === 'Two-line') { const ch = icon('chevron').createInstance(); c.appendChild(ch); ch.resize(18, 18); tint(ch, C.t2); }
        if (type === 'Toggle') c.appendChild(V(K.Toggle, { State: 'On' }).createInstance());
        if (type === 'Action') { const b = V(K.Button, { Style: 'Text', Size: 'Medium', State: 'Default' }).createInstance(); c.appendChild(b); setP(b, 'Label', 'Remove'); }
        comps.push(c); }
      const s = figma.combineAsVariants(comps, page); s.name = 'List row'; s.description = '52 min height. Use inside a List group.'; grid(s, 1, 0, 12); K.ListRow = s; place('Lists and menus', s, true);
      const g = COMP('List group', 'VERTICAL', { itemSpacing: 8 }); g.resize(358, 100); g.primaryAxisSizingMode = 'AUTO'; g.counterAxisSizingMode = 'FIXED';
      const h = await T('Approvals', TS.footBold, C.t2, 'Header'); g.appendChild(h); h.componentPropertyReferences = { characters: prop(g, 'Header', 'TEXT', 'Approvals'), visible: prop(g, 'Show header', 'BOOLEAN', true) };
      const box = AL('VERTICAL', { name: 'Rows' }); g.appendChild(box); box.layoutSizingHorizontal = 'FILL'; radius(box, RAD.card, 26); await glass(box, 'card'); box.clipsContent = true;
      const r1 = V(s, { Type: 'Navigation' }).createInstance(); box.appendChild(r1); r1.layoutSizingHorizontal = 'FILL';
      const sep = figma.createRectangle(); sep.name = 'Divider'; box.appendChild(sep); sep.resize(326, 1); fill(sep, C.hair); sep.layoutAlign = 'CENTER';
      const r2 = V(s, { Type: 'Toggle' }).createInstance(); box.appendChild(r2); r2.layoutSizingHorizontal = 'FILL';
      g.description = 'Header + glass card of List rows with hairline dividers (Settings, Agents, Recent).'; place('Lists and menus', g);
    });
    await step('Agent row', async () => {
      const comps = [];
      for (const [st, cap, dotV, line] of [['Connected', 'Approvals, questions, full control', C.lowf, 'Connected'], ['Disconnected', 'Approvals, questions, full control', C.highf, 'Reconnect on your computer'], ['Not connected', 'Approvals only', C.t2, 'Not connected']]) {
        const c = COMP('Status=' + st, 'HORIZONTAL', { counterAxisAlignItems: 'MIN', itemSpacing: 12 }); c.resize(358, 72); c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'AUTO'; c.paddingLeft = c.paddingRight = 16; c.paddingTop = c.paddingBottom = 12;
        const lg = K['Agent/Claude'].createInstance(); c.appendChild(lg); lg.resize(20, 20); lg.componentPropertyReferences = { mainComponent: prop(c, 'Agent logo', 'INSTANCE_SWAP', K['Agent/Claude'].id) };
        const col = AL('VERTICAL', { name: 'Text', itemSpacing: 2 }); c.appendChild(col); col.layoutSizingHorizontal = 'FILL';
        const n = await T('Claude Code', TS.subBold, C.ink, 'Agent'); col.appendChild(n); n.componentPropertyReferences = { characters: prop(c, 'Agent', 'TEXT', 'Claude Code') };
        const cp = await T(cap, TS.sub, C.t2, 'Capabilities'); col.appendChild(cp); cp.componentPropertyReferences = { characters: prop(c, 'Capabilities', 'TEXT', cap) };
        const sr = AL('HORIZONTAL', { name: 'Status', itemSpacing: 6, counterAxisAlignItems: 'CENTER' }); col.appendChild(sr); const d = figma.createEllipse(); d.name = 'Status dot'; d.resize(8, 8); fill(d, dotV); sr.appendChild(d); sr.appendChild(await T(line, TS.foot, st === 'Disconnected' ? C.highf : C.t2, 'Status'));
        comps.push(c); }
      const s = figma.combineAsVariants(comps, page); s.name = 'Agent row'; s.description = 'Status always has a dot and words.'; grid(s, 1, 0, 12); place('Lists and menus', s);
    });
    await step('Menu', async () => {
      const comps = [];
      for (const [st, title, sub, dotV] of [['Selected', 'Windows PC', 'Awake · 3 sessions', C.lowf], ['Default', 'MacBook', 'Asleep', C.medf], ['Offline', 'Mac 2', 'Offline · last seen 1 day ago', C.t2], ['Add', 'Add a computer', '', null]]) {
        const c = COMP('State=' + st, 'HORIZONTAL', { counterAxisAlignItems: 'CENTER', itemSpacing: 12 }); c.resize(300, 56); c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'AUTO'; c.minHeight = 52; c.paddingLeft = c.paddingRight = 16; c.paddingTop = c.paddingBottom = 8;
        if (st === 'Add') { const p = icon('plus').createInstance(); c.appendChild(p); p.resize(18, 18); tint(p, C.ink); c.appendChild(await T(title, TS.subBold, C.ink, 'Title')); comps.push(c); continue; }
        const d = figma.createEllipse(); d.name = 'Status dot'; d.resize(8, 8); fill(d, dotV); c.appendChild(d);
        const col = AL('VERTICAL', { name: 'Text', itemSpacing: 1 }); c.appendChild(col); col.layoutSizingHorizontal = 'FILL';
        const t = await T(title, TS.subBold, C.ink, 'Title'); col.appendChild(t); t.componentPropertyReferences = { characters: prop(c, 'Title', 'TEXT', title) };
        const s2 = await T(sub, TS.foot, C.t2, 'Status'); col.appendChild(s2); s2.componentPropertyReferences = { characters: prop(c, 'Status', 'TEXT', sub) };
        if (st === 'Selected') { const ck = icon('check').createInstance(); c.appendChild(ck); ck.resize(18, 18); tint(ck, C.ink); }
        comps.push(c); }
      const s = figma.combineAsVariants(comps, page); s.name = 'Menu item'; grid(s, 1, 0, 8); place('Lists and menus', s, true);
      const m = COMP('Computer menu', 'VERTICAL'); m.resize(300, 100); m.primaryAxisSizingMode = 'AUTO'; m.counterAxisSizingMode = 'FIXED'; m.paddingTop = m.paddingBottom = 6; radius(m, RAD.card, 26); fill(m, C.bg); m.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.14 }, offset: { x: 0, y: 20 }, radius: 50, spread: 0, visible: true, blendMode: 'NORMAL', showShadowBehindNode: false }];
      for (const st of ['Selected', 'Default', 'Offline']) { const i = V(s, { State: st }).createInstance(); m.appendChild(i); i.layoutSizingHorizontal = 'FILL'; }
      const sep = figma.createRectangle(); sep.name = 'Divider'; m.appendChild(sep); sep.resize(268, 1); fill(sep, C.hair); sep.layoutAlign = 'CENTER';
      const add = V(s, { State: 'Add' }).createInstance(); m.appendChild(add); add.layoutSizingHorizontal = 'FILL';
      m.description = 'White menu that opens under the computer switcher.'; place('Lists and menus', m);
    });

    // ================= 8. Feedback
    await step('Inline alert', async () => {
      const comps = [];
      for (const [k, ic, col, msg, act] of [['Warning', 'alert', C.medf, 'Notifications are off. You’ll miss requests.', 'Turn on'], ['Error', 'warning', C.highf, 'Windows PC is offline · last seen 2 min ago', 'Retry'], ['Info', 'info', C.ink, 'Codex disconnected after an update. Reconnect on your computer.', 'Fix']]) {
        const c = COMP('Kind=' + k, 'HORIZONTAL', { counterAxisAlignItems: 'CENTER', itemSpacing: 10 }); c.resize(358, 56); c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'AUTO'; c.paddingLeft = 14; c.paddingRight = 8; c.paddingTop = c.paddingBottom = 6; c.cornerRadius = 20; await glass(c, 'card');
        const i = icon(ic).createInstance(); c.appendChild(i); i.resize(20, 20); tint(i, col);
        const t = await T(msg, TS.sub, C.ink, 'Message'); c.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT'; t.componentPropertyReferences = { characters: prop(c, 'Message', 'TEXT', msg) };
        const b = V(K.Button, { Style: 'Text', Size: 'Medium', State: 'Default' }).createInstance(); c.appendChild(b); setP(b, 'Label', act); b.componentPropertyReferences = { visible: prop(c, 'Show action', 'BOOLEAN', k === 'Warning') };
        comps.push(c); }
      const s = figma.combineAsVariants(comps, page); s.name = 'Inline alert'; s.description = 'Neutral glass card. Only the icon carries colour; text stays normal.'; grid(s, 1, 0, 12); place('Feedback', s, true);
    });
    await step('Progress step', async () => {
      const comps = [];
      for (const st of ['Done', 'Current', 'Pending']) { const c = COMP('State=' + st, 'HORIZONTAL', { counterAxisAlignItems: 'CENTER', itemSpacing: 12 }); c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'AUTO';
        const d = AL('HORIZONTAL', { name: 'Marker', primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' }); c.appendChild(d); d.resize(28, 28); d.primaryAxisSizingMode = 'FIXED'; d.counterAxisSizingMode = 'FIXED'; d.cornerRadius = 14;
        if (st === 'Done') { fill(d, C.pbg); const i = icon('check').createInstance(); d.appendChild(i); i.resize(16, 16); tint(i, C.ptx); } else if (st === 'Current') { stroke(d, C.ink, 1.5); const i = icon('spinner').createInstance(); d.appendChild(i); i.resize(16, 16); tint(i, C.ink); } else stroke(d, C.hair, 1.5);
        const lab = st === 'Done' ? 'Sent' : st === 'Current' ? 'Reached your computer' : 'Running';
        const t = await T(lab, TS.body, st === 'Pending' ? C.t2 : C.ink, 'Label'); c.appendChild(t); t.componentPropertyReferences = { characters: prop(c, 'Label', 'TEXT', lab) }; comps.push(c); }
      const s = figma.combineAsVariants(comps, page); s.name = 'Progress step'; s.description = 'Sent → Reached your computer → Running.'; grid(s, 1, 0, 14); place('Feedback', s);
    });
    await step('Numbered step', async () => {
      const c = COMP('Numbered step', 'HORIZONTAL', { counterAxisAlignItems: 'MIN', itemSpacing: 12 }); c.resize(326, 50); c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'AUTO';
      const n = AL('HORIZONTAL', { name: 'Number', primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' }); c.appendChild(n); n.resize(28, 28); n.primaryAxisSizingMode = 'FIXED'; n.counterAxisSizingMode = 'FIXED'; n.cornerRadius = 14; fill(n, C.pbg);
      const nt = await T('1', TS.time, C.ptx, 'Number'); n.appendChild(nt); nt.componentPropertyReferences = { characters: prop(c, 'Number', 'TEXT', '1') };
      const col = AL('VERTICAL', { name: 'Text', itemSpacing: 2 }); c.appendChild(col); col.layoutSizingHorizontal = 'FILL';
      const a = await T('Install the helper on your computer', TS.headline, C.ink, 'Title'); col.appendChild(a); a.componentPropertyReferences = { characters: prop(c, 'Title', 'TEXT', 'Install the helper on your computer') };
      const b = await T('A small app that talks to your agents', TS.sub, C.t2, 'Description'); col.appendChild(b); b.componentPropertyReferences = { characters: prop(c, 'Description', 'TEXT', 'A small app that talks to your agents') };
      c.description = 'Setup steps (Setup intro, Add a computer).'; place('Feedback', c);
    });
    await step('Loading and empty states', async () => {
      for (const [name, ic, title, body, act] of [['Loading state', 'spinner', 'Connecting to your computer…', 'Keep the helper open on your computer.', 'Cancel'], ['Empty state', 'check', 'You’re all caught up', 'New requests from your agents will show up here.', null]]) {
        const c = COMP(name, 'VERTICAL', { counterAxisAlignItems: 'CENTER', itemSpacing: 12 }); c.resize(358, 200); c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'; c.paddingTop = c.paddingBottom = 32;
        const i = icon(ic).createInstance(); c.appendChild(i); i.resize(36, 36); tint(i, C.ink);
        const t = await T(title, TS.title2, C.ink, 'Title'); t.textAlignHorizontal = 'CENTER'; c.appendChild(t); t.componentPropertyReferences = { characters: prop(c, 'Title', 'TEXT', title) };
        const b = await T(body, TS.body, C.t2, 'Body'); b.textAlignHorizontal = 'CENTER'; c.appendChild(b); b.layoutSizingHorizontal = 'FILL'; b.textAutoResize = 'HEIGHT'; b.componentPropertyReferences = { characters: prop(c, 'Body', 'TEXT', body) };
        if (act) { const x = V(K.Button, { Style: 'Text', Size: 'Medium', State: 'Default' }).createInstance(); c.appendChild(x); setP(x, 'Label', act); }
        place('Feedback', c); }
    });

    // ================= 9. Cards
    const meta = async (parent, logo, agent, proj, time, c) => {
      const row = AL('HORIZONTAL', { name: 'Meta', counterAxisAlignItems: 'CENTER', itemSpacing: 12 }); parent.appendChild(row); row.layoutSizingHorizontal = 'FILL';
      const left = AL('HORIZONTAL', { name: 'Agent', counterAxisAlignItems: 'CENTER', itemSpacing: 6 }); row.appendChild(left); left.layoutSizingHorizontal = 'FILL';
      const lg = logo.createInstance(); left.appendChild(lg); lg.resize(18, 18);
      const a = await T(agent, TS.subBold, C.ink, 'Agent'); left.appendChild(a); const p = await T(proj, TS.proj, C.t2, 'Project'); left.appendChild(p); const t = await T(time, TS.time, C.t2, 'Time'); row.appendChild(t);
      if (c) { lg.componentPropertyReferences = { mainComponent: prop(c, 'Agent logo', 'INSTANCE_SWAP', logo.id) }; a.componentPropertyReferences = { characters: prop(c, 'Agent', 'TEXT', agent) }; p.componentPropertyReferences = { characters: prop(c, 'Project', 'TEXT', proj) }; t.componentPropertyReferences = { characters: prop(c, 'Time', 'TEXT', time) }; }
    };
    const cardBase = async (name) => { const c = COMP(name, 'VERTICAL', { itemSpacing: 12 }); c.resize(358, 100); c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'; c.paddingTop = c.paddingBottom = c.paddingLeft = c.paddingRight = 16; radius(c, RAD.card, 26); await glass(c, 'card'); return c; };
    await step('Summary card', async () => {
      const c = COMP('Summary card', 'HORIZONTAL'); c.resize(358, 80); c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'AUTO'; radius(c, RAD.field, 24); await glass(c, 'card');
      const cols = [['Waiting', '2', 'hourglass'], ['Working', '1', 'spinner'], ['Completed', '2', 'check']];
      for (let i = 0; i < 3; i++) { const [l, n, ic] = cols[i];
        const col = AL('VERTICAL', { name: l, counterAxisAlignItems: 'CENTER', itemSpacing: 6 }); c.appendChild(col); col.layoutSizingHorizontal = 'FILL'; col.paddingTop = 16; col.paddingBottom = 14;
        const num = await T(n, TS.stat, C.ink, l + ' count'); col.appendChild(num); num.componentPropertyReferences = { characters: prop(c, l + ' count', 'TEXT', n) };
        const lab = AL('HORIZONTAL', { name: 'Label', itemSpacing: 5, counterAxisAlignItems: 'CENTER' }); col.appendChild(lab); const ii = icon(ic).createInstance(); lab.appendChild(ii); ii.resize(14, 14); tint(ii, C.t2); lab.appendChild(await T(l, TS.foot, C.t2, 'Label'));
        if (i < 2) { const d = figma.createRectangle(); d.name = 'Divider'; c.appendChild(d); d.resize(1, 40); fill(d, C.hair); d.layoutAlign = 'CENTER'; } }
      c.description = 'Waiting · Working · Completed.'; place('Cards', c, true);
    });
    await step('Section title', async () => {
      const c = COMP('Section title', 'HORIZONTAL', { counterAxisAlignItems: 'BASELINE', itemSpacing: 8 }); c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'AUTO';
      const t = await T('Needs you', TS.title3, C.ink, 'Title'); c.appendChild(t); t.componentPropertyReferences = { characters: prop(c, 'Title', 'TEXT', 'Needs you') };
      const n = await T('2', TS.subBold, C.t2, 'Count'); c.appendChild(n); n.componentPropertyReferences = { characters: prop(c, 'Count', 'TEXT', '2'), visible: prop(c, 'Show count', 'BOOLEAN', true) };
      place('Cards', c);
    });
    await step('Request card · Approval', async () => {
      const comps = [];
      for (const [risk, chip, title, cmd] of [['Low', 'Low risk', 'Delete the old build folder', 'rm -rf dist'], ['Medium', 'Medium risk', 'Install a new package', 'npm install jsonwebtoken@9'], ['High', 'High risk', 'Force-push to main', 'git push --force origin main']]) {
        const c = await cardBase('Risk=' + risk);
        await meta(c, K['Agent/Claude'], 'Claude Code', 'my-app', '2 min ago', c);
        const top = AL('VERTICAL', { name: 'What it wants', itemSpacing: 8 }); c.appendChild(top); top.layoutSizingHorizontal = 'FILL';
        top.appendChild(V(K.Chip, { Kind: chip }).createInstance());
        const t = await T(title, TS.headline, C.ink, 'Title'); top.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.componentPropertyReferences = { characters: prop(c, 'Title', 'TEXT', title) };
        const code = AL('HORIZONTAL', { name: 'Command box' }); c.appendChild(code); code.layoutSizingHorizontal = 'FILL'; code.paddingTop = code.paddingBottom = 12; code.paddingLeft = code.paddingRight = 14; radius(code, RAD.code, 12); fieldFill(code);
        const ct = await T(cmd, TS.cmd, C.ink, 'Command'); code.appendChild(ct); ct.layoutSizingHorizontal = 'FILL'; ct.componentPropertyReferences = { characters: prop(c, 'Command', 'TEXT', cmd) };
        const br = AL('HORIZONTAL', { name: 'Buttons', itemSpacing: 8 }); c.appendChild(br); br.layoutSizingHorizontal = 'FILL';
        const d = V(K.Button, { Style: 'Glass', Size: 'Medium', State: 'Default' }).createInstance(); br.appendChild(d); d.layoutSizingHorizontal = 'FILL'; setP(d, 'Label', 'Deny');
        const a = V(K.Button, { Style: 'Primary', Size: 'Medium', State: 'Default' }).createInstance(); br.appendChild(a); a.layoutSizingHorizontal = 'FILL'; setP(a, 'Label', risk === 'High' ? 'Review' : 'Approve'); setP(a, 'Show icon', risk !== 'High');
        const f = await T('Goes back to your computer after 10 min', TS.foot, C.t2, 'Time note'); c.appendChild(f);
        comps.push(c); }
      const s = figma.combineAsVariants(comps, page); s.name = 'Request card · Approval'; s.description = 'Low/Medium: Approve with Face ID. High: Review → full screen with Hold to approve.'; grid(s, 3, 24, 24); place('Cards', s, true);
    });
    await step('Request card · Question', async () => {
      const c = await cardBase('Request card · Question');
      await meta(c, K['Agent/Codex'], 'Codex', 'api', '5 min ago', c);
      const q = await T('Which login method should I add?', TS.headline, C.ink, 'Question'); c.appendChild(q); q.layoutSizingHorizontal = 'FILL'; q.componentPropertyReferences = { characters: prop(c, 'Question', 'TEXT', 'Which login method should I add?') };
      const list = AL('VERTICAL', { name: 'Answers', itemSpacing: 8 }); c.appendChild(list); list.layoutSizingHorizontal = 'FILL';
      for (const [n, l] of [['1', 'Email and password'], ['2', 'Google sign-in']]) { const o = V(K.AnswerOption, { State: 'Default' }).createInstance(); list.appendChild(o); o.layoutSizingHorizontal = 'FILL'; setP(o, 'Number', n); setP(o, 'Label', l); }
      const inp = V(K.Input, { State: 'Empty' }).createInstance(); list.appendChild(inp); inp.layoutSizingHorizontal = 'FILL';
      c.appendChild(await T('Goes back to your computer after 10 min', TS.foot, C.t2, 'Time note'));
      c.description = 'Options top to bottom, input last. Tapping an option sends it.'; place('Cards', c);
    });
    await step('Session row', async () => {
      const comps = [];
      for (const [st, logo, agent, proj, line, time] of [['Working', 'Agent/Claude', 'Claude Code', 'portfolio', 'Editing login.js', '4m'], ['Paused', 'Agent/Claude', 'Claude Code', 'my-app', 'Paused until your computer is back', '18m'], ['Done', 'Agent/Cursor', 'Cursor', 'site', 'Added the contact form', '10:42'], ['Failed', 'Agent/Codex', 'Codex', 'docs', '2 tests failed, so it stopped', '09:15']]) {
        const c = COMP('Status=' + st, 'VERTICAL', { itemSpacing: 6 }); c.resize(358, 72); c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'; c.paddingTop = c.paddingBottom = 12; c.paddingLeft = c.paddingRight = 16; radius(c, RAD.card, 26); await glass(c, 'card');
        await meta(c, K[logo], agent, proj, time, null);
        const r = AL('HORIZONTAL', { name: 'Status', itemSpacing: 8, counterAxisAlignItems: 'CENTER' }); c.appendChild(r); r.layoutSizingHorizontal = 'FILL';
        r.appendChild(V(K.Chip, { Kind: st }).createInstance());
        const lt = await T(line, TS.sub, C.t2, 'Line'); r.appendChild(lt); lt.layoutSizingHorizontal = 'FILL'; lt.textTruncation = 'ENDING'; lt.maxLines = 1;
        comps.push(c); }
      const s = figma.combineAsVariants(comps, page); s.name = 'Session row'; grid(s, 1, 0, 16); place('Cards', s);
    });

    // ================= 10. Navigation and overlays
    await step('Header', async () => {
      const c = COMP('Header', 'VERTICAL', { itemSpacing: 12 }); c.resize(358, 100); c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED';
      const top = AL('HORIZONTAL', { name: 'Logo and settings', counterAxisAlignItems: 'CENTER', primaryAxisAlignItems: 'SPACE_BETWEEN' }); c.appendChild(top); top.layoutSizingHorizontal = 'FILL';
      const brand = AL('HORIZONTAL', { name: 'Brand', itemSpacing: 10, counterAxisAlignItems: 'CENTER' }); top.appendChild(brand); const m = K['Logo/Nudge mark'].createInstance(); brand.appendChild(m); m.resize(30, 30); brand.appendChild(await T('Nudge', TS.title3, C.ink, 'App name'));
      top.appendChild(V(K.IconButton, { State: 'Default' }).createInstance());
      const sw = AL('HORIZONTAL', { name: 'Computer switcher', itemSpacing: 8, counterAxisAlignItems: 'CENTER' }); c.appendChild(sw); sw.paddingLeft = 12; sw.paddingRight = 14; sw.resize(200, 44); sw.counterAxisSizingMode = 'FIXED'; sw.primaryAxisSizingMode = 'AUTO'; sw.cornerRadius = 22; await glass(sw, 'btn');
      const d = figma.createEllipse(); d.name = 'Status dot'; d.resize(8, 8); fill(d, C.lowf); sw.appendChild(d);
      const pc = await T('Windows PC', TS.sub, C.ink, 'Computer'); pc.fontName = F.med; sw.appendChild(pc); pc.componentPropertyReferences = { characters: prop(c, 'Computer', 'TEXT', 'Windows PC') };
      const st = await T('· awake', TS.sub, C.t2, 'Status'); sw.appendChild(st); st.componentPropertyReferences = { characters: prop(c, 'Status', 'TEXT', '· awake') };
      const dn = icon('chevron-down').createInstance(); sw.appendChild(dn); dn.resize(16, 16); tint(dn, C.t2);
      c.description = 'Home header: Nudge mark + name, Settings button, computer switcher.'; place('Navigation and overlays', c, true);
    });
    await step('Top bar', async () => {
      const comps = [];
      for (const tr of ['None', 'Count', 'Action']) { const c = COMP('Trailing=' + tr, 'HORIZONTAL', { counterAxisAlignItems: 'CENTER', primaryAxisAlignItems: 'SPACE_BETWEEN' }); c.resize(390, 52); c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'FIXED'; c.paddingLeft = 4; c.paddingRight = 8; fill(c, C.bg);
        const b = AL('HORIZONTAL', { name: 'Back', primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' }); c.appendChild(b); b.resize(44, 44); b.primaryAxisSizingMode = 'FIXED'; b.counterAxisSizingMode = 'FIXED'; const bi = icon('back').createInstance(); b.appendChild(bi); bi.resize(22, 22); tint(bi, C.ink);
        const mid = AL('HORIZONTAL', { name: 'Title', itemSpacing: 6, counterAxisAlignItems: 'CENTER' }); c.appendChild(mid);
        const lg = K['Agent/Claude'].createInstance(); mid.appendChild(lg); lg.resize(18, 18); lg.componentPropertyReferences = { visible: prop(c, 'Show logo', 'BOOLEAN', true), mainComponent: prop(c, 'Logo', 'INSTANCE_SWAP', K['Agent/Claude'].id) };
        const t = await T('Claude Code · my-app', TS.subBold, C.ink, 'Title'); mid.appendChild(t); t.componentPropertyReferences = { characters: prop(c, 'Title', 'TEXT', 'Claude Code · my-app') };
        const tw = AL('HORIZONTAL', { name: 'Trailing', primaryAxisAlignItems: 'MAX', counterAxisAlignItems: 'CENTER' }); c.appendChild(tw); tw.resize(64, 44); tw.primaryAxisSizingMode = 'FIXED'; tw.counterAxisSizingMode = 'FIXED';
        if (tr === 'Count') { const x = await T('1 of 2', TS.time, C.t2, 'Count'); tw.appendChild(x); x.componentPropertyReferences = { characters: prop(c, 'Count', 'TEXT', '1 of 2') }; }
        if (tr === 'Action') { const x = await T('Done', TS.subBold, C.ink, 'Action'); tw.appendChild(x); x.componentPropertyReferences = { characters: prop(c, 'Action', 'TEXT', 'Done') }; }
        comps.push(c); }
      const s = figma.combineAsVariants(comps, page); s.name = 'Top bar'; s.description = 'Solid, same colour as the page, no divider. Sits below the status bar (top 50).'; grid(s, 1, 0, 12); place('Navigation and overlays', s);
    });
    await step('Bottom action bar', async () => {
      const comps = [];
      for (const k of ['One', 'Two', 'Stacked']) { const c = COMP('Buttons=' + k, k === 'Stacked' ? 'VERTICAL' : 'HORIZONTAL', { itemSpacing: k === 'Stacked' ? 10 : 12 }); c.resize(390, 100); c.primaryAxisSizingMode = k === 'Stacked' ? 'AUTO' : 'FIXED'; c.counterAxisSizingMode = k === 'Stacked' ? 'FIXED' : 'AUTO'; c.paddingLeft = c.paddingRight = 16; c.paddingTop = 12; c.paddingBottom = 34; fill(c, C.bg);
        const prim = () => { const p = V(K.Button, { Style: 'Primary', Size: 'Large', State: 'Default' }).createInstance(); c.appendChild(p); p.layoutSizingHorizontal = 'FILL'; return p; };
        const gl = () => { const g = V(K.Button, { Style: 'Glass', Size: 'Large', State: 'Default' }).createInstance(); c.appendChild(g); g.layoutSizingHorizontal = 'FILL'; return g; };
        if (k === 'One') setP(prim(), 'Label', 'Continue');
        if (k === 'Two') { setP(gl(), 'Label', 'Deny'); setP(prim(), 'Label', 'Approve'); }
        if (k === 'Stacked') { setP(prim(), 'Label', 'Turn on notifications'); setP(gl(), 'Label', 'Not now'); }
        comps.push(c); }
      const s = figma.combineAsVariants(comps, page); s.name = 'Bottom action bar'; s.description = 'Solid, no divider. 34 bottom padding for the home indicator. Use Stacked when labels are long.'; grid(s, 1, 0, 16); place('Navigation and overlays', s);
    });
    await step('Tab bar', async () => {
      const comps = [];
      for (const act of ['Home', 'Agents', 'None']) { const c = COMP('Active=' + act, 'HORIZONTAL', { itemSpacing: 2, counterAxisAlignItems: 'CENTER' }); c.resize(264, 64); c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'FIXED'; c.paddingLeft = c.paddingRight = c.paddingTop = c.paddingBottom = 5; radius(c, RAD.tab, 32); await glass(c, 'btn');
        const tab = async (name, iconComp, active) => { const t = AL('VERTICAL', { name: name + ' tab', primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER', itemSpacing: 2 }); c.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.layoutSizingVertical = 'FILL'; t.cornerRadius = 27; if (active) t.fills = [{ type: 'SOLID', color: { r: 0.04, g: 0.04, b: 0.04 }, opacity: 0.06 }];
          if (iconComp) { const i = iconComp.createInstance(); t.appendChild(i); i.resize(22, 22); if (iconComp !== icon('home-filled')) tint(i, active ? C.ink : C.t2); else { for (const v of i.findAll(x => x.type === 'VECTOR')) v.fills = [paint(C.ink)]; } }
          else { const p = AL('HORIZONTAL', { name: 'New task pill', primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' }); t.appendChild(p); p.resize(36, 30); p.primaryAxisSizingMode = 'FIXED'; p.counterAxisSizingMode = 'FIXED'; p.cornerRadius = 15; fill(p, C.pbg); const pi = icon('plus').createInstance(); p.appendChild(pi); pi.resize(18, 18); tint(pi, C.ptx); }
          const l = await T(name, TS.tab, active || !iconComp ? C.ink : C.t2, 'Label'); if (active) l.fontName = F.semi; t.appendChild(l); };
        await tab('Home', act === 'Home' ? icon('home-filled') : icon('home'), act === 'Home');
        await tab('New task', null, false);
        await tab('Agents', icon('computer'), act === 'Agents');
        comps.push(c); }
      const s = figma.combineAsVariants(comps, page); s.name = 'Tab bar'; s.description = 'Home · New task (solid pill) · Agents. Settings lives in the header. Active tab: bubble + bold label + filled icon. Each tab ≥ 54 tall.'; grid(s, 3, 24, 24); place('Navigation and overlays', s, true);
    });
    await step('Bottom sheet', async () => {
      const c = COMP('Bottom sheet', 'VERTICAL', { itemSpacing: 12 }); c.resize(370, 200); c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'; c.paddingTop = 12; c.paddingBottom = 24; c.paddingLeft = c.paddingRight = 22; radius(c, RAD.sheet, 38); fill(c, C.bg); c.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.18 }, offset: { x: 0, y: 20 }, radius: 50, spread: 0, visible: true, blendMode: 'NORMAL', showShadowBehindNode: false }];
      const g = figma.createRectangle(); g.name = 'Sheet handle'; g.resize(40, 5); g.cornerRadius = 3; g.fills = [{ type: 'SOLID', color: { r: 0.04, g: 0.04, b: 0.04 }, opacity: 0.18 }]; c.appendChild(g); g.layoutAlign = 'CENTER';
      const t = await T('Stop this session?', TS.title2, C.ink, 'Title'); c.appendChild(t); t.componentPropertyReferences = { characters: prop(c, 'Title', 'TEXT', 'Stop this session?') };
      const b = await T('5 files were already changed. They stay changed until you undo them.', TS.body, C.t2, 'Body'); c.appendChild(b); b.layoutSizingHorizontal = 'FILL'; b.textAutoResize = 'HEIGHT'; b.componentPropertyReferences = { characters: prop(c, 'Body', 'TEXT', '5 files were already changed. They stay changed until you undo them.') };
      const p1 = V(K.Button, { Style: 'Primary', Size: 'Large', State: 'Default' }).createInstance(); c.appendChild(p1); p1.layoutSizingHorizontal = 'FILL'; setP(p1, 'Label', 'Stop session');
      const p2 = V(K.Button, { Style: 'Glass', Size: 'Large', State: 'Default' }).createInstance(); c.appendChild(p2); p2.layoutSizingHorizontal = 'FILL'; setP(p2, 'Label', 'Keep going');
      c.description = 'Floating, solid white, 10 from the screen edges. Put a Scrim behind it. Swap buttons (e.g. Destructive for Sign out).'; place('Navigation and overlays', c);
      const sc = COMP('Scrim'); sc.resize(390, 844); sc.fills = [{ type: 'SOLID', color: { r: 0.04, g: 0.04, b: 0.04 }, opacity: 0.3 }]; sc.description = 'Dims the screen behind sheets and menus (30%; 12% for menus).'; place('Navigation and overlays', sc);
    });
    await step('In-app banner', async () => {
      const comps = [];
      for (const [k, title, detail, act] of [['Request', 'Claude Code needs your approval', 'my-app · just now', 'Review'], ['Not sent', 'Approval not sent', 'You’re offline. Nothing was approved.', 'Retry']]) {
        const c = COMP('Kind=' + k, 'HORIZONTAL', { counterAxisAlignItems: 'CENTER', itemSpacing: 12 }); c.resize(366, 70); c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'AUTO'; c.paddingTop = c.paddingBottom = c.paddingRight = 12; c.paddingLeft = 16; radius(c, RAD.card, 26); fill(c, C.bg); c.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.14 }, offset: { x: 0, y: 16 }, radius: 40, spread: 0, visible: true, blendMode: 'NORMAL', showShadowBehindNode: false }];
        const col = AL('VERTICAL', { name: 'Text', itemSpacing: 2 }); c.appendChild(col); col.layoutSizingHorizontal = 'FILL';
        const a = await T(title, TS.subBold, C.ink, 'Title'); col.appendChild(a); a.layoutSizingHorizontal = 'FILL'; a.componentPropertyReferences = { characters: prop(c, 'Title', 'TEXT', title) };
        const b = await T(detail, TS.time, C.t2, 'Detail'); col.appendChild(b); b.layoutSizingHorizontal = 'FILL'; b.componentPropertyReferences = { characters: prop(c, 'Detail', 'TEXT', detail) };
        const r = V(K.Button, { Style: 'Primary', Size: 'Medium', State: 'Default' }).createInstance(); c.appendChild(r); setP(r, 'Label', act);
        comps.push(c); }
      const s = figma.combineAsVariants(comps, page); s.name = 'In-app banner'; s.description = 'Shown just above the tab bar.'; grid(s, 1, 0, 16); place('Navigation and overlays', s);
    });
    await step('Lock-screen notification', async () => {
      const comps = [];
      for (const k of ['Approval', 'Question', 'Info']) { const c = COMP('Kind=' + k, 'VERTICAL', { itemSpacing: 3 }); c.resize(370, 100); c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'; c.paddingTop = c.paddingBottom = 12; c.paddingLeft = c.paddingRight = 14; c.cornerRadius = 22; c.fills = [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.97 }, opacity: 0.86 }]; c.effects = [{ type: 'BACKGROUND_BLUR', radius: 30, visible: true }];
        const top = AL('HORIZONTAL', { name: 'App', itemSpacing: 8, counterAxisAlignItems: 'CENTER' }); c.appendChild(top); top.layoutSizingHorizontal = 'FILL';
        const ai = K['Logo/App icon · Dark'].createInstance(); top.appendChild(ai); ai.resize(20, 20); top.appendChild(await T('NUDGE', TS.footBold, C.t2, 'App name')); const sp = AL('HORIZONTAL', { name: 'Spacer' }); top.appendChild(sp); sp.layoutGrow = 1; top.appendChild(await T('now', TS.foot, C.t2, 'Time'));
        const title = k === 'Question' ? 'Codex · api asks' : k === 'Approval' ? 'Claude Code · my-app' : 'Cursor · site';
        const line = k === 'Question' ? 'Which login method should I add?' : k === 'Approval' ? 'Wants to delete old build files' : 'Finished: contact form added';
        const t = await T(title, TS.subBold, C.ink, 'Title'); c.appendChild(t); t.componentPropertyReferences = { characters: prop(c, 'Title', 'TEXT', title) };
        const l = await T(line, TS.sub, C.ink, 'Line'); c.appendChild(l); l.layoutSizingHorizontal = 'FILL'; l.componentPropertyReferences = { characters: prop(c, 'Line', 'TEXT', line) };
        if (k !== 'Info') { const acts = AL('HORIZONTAL', { name: 'Actions', itemSpacing: 6 }); c.appendChild(acts); acts.layoutSizingHorizontal = 'FILL'; acts.paddingTop = 6;
          const labels = k === 'Approval' ? ['Approve', 'Deny', 'Open'] : ['Email and password', 'Google sign-in'];
          labels.forEach((x, i) => { const b = V(K.Button, { Style: i === 0 && k === 'Approval' ? 'Primary' : 'Glass', Size: 'Medium', State: 'Default' }).createInstance(); acts.appendChild(b); b.layoutSizingHorizontal = 'FILL'; setP(b, 'Label', x); if (i === 0 && k === 'Approval') setP(b, 'Show icon', true); }); }
        comps.push(c); }
      const s = figma.combineAsVariants(comps, page); s.name = 'Lock-screen notification'; s.description = 'Mock of the iOS notification for flows. Real notifications are drawn by iOS/Android; we only control text and actions.'; grid(s, 3, 24, 24); place('Navigation and overlays', s, true);
    });

    // ---------------- Tidy sections
    let y = 0;
    for (const title of Object.keys(groups)) { const g = groups[title]; let mx = 0, my = 0; for (const ch of g.s.children) { mx = Math.max(mx, ch.x + ch.width); my = Math.max(my, ch.y + ch.height); } g.s.resizeWithoutConstraints(Math.max(1800, mx + 80), my + 120); g.s.x = startX; g.s.y = y; y += g.s.height + 200; }
    figma.viewport.scrollAndZoomIntoView(Object.values(groups).map(g => g.s));
  } catch (e) { errors.push('Setup: ' + e.message); console.error(e); }
  return { made: made.length, errors };
}

async function addDarkMode() {
  const errors = []; let setsDone = 0, darkMade = 0;
  try {
    // ---------- Find all components on all pages
    const all = [];
    for (const p of figma.root.children) { await p.loadAsync(); for (const n of p.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] })) all.push(n); }
    const isVariant = n => n.type === 'COMPONENT' && n.parent && n.parent.type === 'COMPONENT_SET';
    const skip = n => /^(Icon\/|Agent\/|Brand\/|Logo\/)/.test(n.name);
    const byName = name => all.find(n => n.name === name && !isVariant(n));

    // ---------- Tokens
    const colls = await figma.variables.getLocalVariableCollectionsAsync();
    const vars = await figma.variables.getLocalVariablesAsync('COLOR');
    const L = colls.find(c => c.name === 'Color / Light'), D = colls.find(c => c.name === 'Color / Dark');
    if (!L || !D) throw new Error('Need both “Color / Light” and “Color / Dark” variable groups.');
    const darkOf = new Map();
    for (const v of vars.filter(v => v.variableCollectionId === L.id)) { const d = vars.find(x => x.variableCollectionId === D.id && x.name === v.name); if (d) darkOf.set(v.id, d); }
    const fx = await figma.getLocalEffectStylesAsync(); const fid = n => (fx.find(s => s.name === n) || {}).id;
    const FX = { [fid('Glass/Card · Light')]: fid('Glass/Card · Dark'), [fid('Glass/Button · Light')]: fid('Glass/Button · Dark') };
    if (!fid('Glass/Card · Dark') || !fid('Glass/Button · Dark')) throw new Error('Need “Glass/Card · Dark” and “Glass/Button · Dark” effect styles.');

    // ---------- White logo versions for dark backgrounds
    const whiteMark = byName('Logo/Nudge mark · White');
    const whiteAgent = {};
    for (const [k, name] of [['codex', 'Codex'], ['cursor', 'Cursor']]) {
      let c = byName('Agent/' + name + ' · White');
      if (!c) { const base = byName('Agent/' + name); const [pth, s] = AGENT[k]; const node = figma.createNodeFromSvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}"><path d="${pth}" fill="#F5F5F7" fill-rule="evenodd"/></svg>`); node.rescale(18 / node.width); c = figma.createComponentFromNode(node); c.name = 'Agent/' + name + ' · White'; c.fills = []; c.description = 'For dark backgrounds.'; if (base && base.parent) { base.parent.appendChild(c); c.x = base.x + base.width + 24; c.y = base.y; } all.push(c); }
      whiteAgent['Agent/' + name] = c;
    }

    // ---------- Pass 1: give every component a Mode variant
    const darkClones = [];
    const targets = all.filter(n => !skip(n) && (n.type === 'COMPONENT_SET' || (n.type === 'COMPONENT' && !isVariant(n))));
    for (const t of targets) {
      try {
        let set = t;
        if (t.type === 'COMPONENT') {
          const parent = t.parent; const x = t.x, y = t.y, name = t.name, desc = t.description;
          t.name = 'Mode=Light';
          set = figma.combineAsVariants([t], parent); set.name = name; set.description = desc; set.x = x; set.y = y;
          t.x = 24; t.y = 24;
        } else {
          if (set.children.some(c => /(^|, )Mode=/.test(c.name))) continue; // already done
          for (const c of set.children) c.name = c.name + ', Mode=Light';
        }
        let lw = 0, lh = 0; for (const c of set.children) { lw = Math.max(lw, c.x + c.width); lh = Math.max(lh, c.y + c.height); }
        // Dark goes first: top-left on the canvas and top of the layer list, so it is the default variant.
        const offset = lw + 48;
        const lights = [...set.children];
        for (const c of lights) {
          const d = c.clone(); set.appendChild(d); d.name = c.name.replace('Mode=Light', 'Mode=Dark'); d.x = c.x; d.y = c.y; darkClones.push(d);
          c.x = c.x + offset;
        }
        const total = offset + lw + 24;
        set.resizeWithoutConstraints(total, lh + 24);
        const mid = (offset - 24) / total;
        const DK = { r: 0.055, g: 0.059, b: 0.071, a: 1 }, WH = { r: 1, g: 1, b: 1, a: 1 };
        set.fills = [{ type: 'GRADIENT_LINEAR', gradientTransform: [[1, 0, 0], [0, 1, 0]], gradientStops: [{ position: 0, color: DK }, { position: mid, color: DK }, { position: Math.min(mid + 0.0001, 1), color: WH }, { position: 1, color: WH }] }];
        setsDone++;
      } catch (e) { errors.push(t.name + ': ' + e.message); }
    }

    // ---------- Pass 2 covers every dark variant, including ones left half-done by an earlier run
    for (const t of targets) { const set = t.type === 'COMPONENT_SET' ? t : t.parent; if (!set || set.type !== 'COMPONENT_SET') continue; for (const ch of set.children) if (/Mode=Dark/.test(ch.name) && !darkClones.includes(ch)) darkClones.push(ch); }
    // re-find sets created from single components in pass 1
    for (const p of figma.root.children) for (const s of p.findAllWithCriteria({ types: ['COMPONENT_SET'] })) for (const ch of s.children) if (/Mode=Dark/.test(ch.name) && !darkClones.includes(ch)) darkClones.push(ch);
    // ---------- Pass 2: turn each dark clone dark
    const rawDark = (p) => {
      if (p.type !== 'SOLID' || (p.boundVariables && p.boundVariables.color)) return p;
      const { r, g, b } = p.color, o = p.opacity === undefined ? 1 : p.opacity;
      const W = (op) => Object.assign({}, p, { color: { r: 1, g: 1, b: 1 }, opacity: op });
      if (r > 0.99 && g > 0.99 && b > 0.99) { if (Math.abs(o - 0.62) < 0.02) return W(0.065); if (Math.abs(o - 0.58) < 0.02) return W(0.10); if (Math.abs(o - 0.7) < 0.02) return W(0.04); }
      if (r > 0.9 && r < 0.95 && g > 0.9 && o > 0.85 && Math.abs(r - b) < 0.02) return W(0.16);   // pressed glass
      if (r > 0.88 && r < 0.91 && o > 0.95) return W(0.12);                                      // disabled fill
      if (r < 0.06 && g < 0.06 && b < 0.06 && o < 0.1) return W(0.10);                           // active tab bubble
      if (r < 0.06 && g < 0.06 && b < 0.06 && o > 0.15 && o < 0.2) return W(0.3);              // sheet handle
      if (r > 0.95 && r < 0.97 && o > 0.8 && o < 0.9) return Object.assign({}, p, { color: { r: 0.12, g: 0.12, b: 0.13 }, opacity: 0.86 }); // lock-screen notification
      return p;
    };
    const rebind = (paints) => Array.isArray(paints) ? paints.map(p => {
      if (p.type === 'SOLID' && p.boundVariables && p.boundVariables.color) { const d = darkOf.get(p.boundVariables.color.id); if (d) return figma.variables.setBoundVariableForPaint(Object.assign({}, p), 'color', d); return p; }
      return rawDark(p);
    }) : paints;
    for (const d of darkClones) {
      try {
        // Walk the variant but never step inside nested instances: switching their Mode replaces
        // their contents, so anything collected inside them would no longer exist.
        const nodes = []; const walk = (x) => { nodes.push(x); if (x !== d && x.type === 'INSTANCE') return; if ('children' in x) for (const ch of x.children) walk(ch); }; walk(d);
        for (const n of nodes) { try {
          if (n.type === 'INSTANCE') {
            const mc = await n.getMainComponentAsync(); if (!mc) continue;
            if (mc.name === 'Logo/Nudge mark' && whiteMark) { n.swapComponent(whiteMark); continue; }
            if (whiteAgent[mc.name]) { n.swapComponent(whiteAgent[mc.name]); continue; }
            const owner = mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent : null;
            if (owner && owner.children.some(c => /Mode=Dark/.test(c.name))) { try { n.setProperties({ Mode: 'Dark' }); } catch (e) {} continue; }
            // icons and other plain instances: rebind their tinted strokes/fills
            for (const v of n.findAll(x => 'strokes' in x)) { if (Array.isArray(v.strokes) && v.strokes.length) v.strokes = rebind(v.strokes); if (Array.isArray(v.fills) && v.fills.length) v.fills = rebind(v.fills); }
            continue;
          }
          // on dark, the "on" toggle track is light, so the knob turns dark; hold progress darkens instead of lightening
          if (n.name === 'Knob' && /State=On/.test(d.name)) { n.fills = [{ type: 'SOLID', color: { r: 0.055, g: 0.059, b: 0.071 } }]; continue; }
          if (n.name === 'Hold progress') { n.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.14 }]; continue; }
          if ('fills' in n && Array.isArray(n.fills) && n.fills.length) n.fills = rebind(n.fills);
          if ('strokes' in n && Array.isArray(n.strokes) && n.strokes.length) n.strokes = rebind(n.strokes);
          if ('effectStyleId' in n && n.effectStyleId && FX[n.effectStyleId]) await n.setEffectStyleIdAsync(FX[n.effectStyleId]);
          else if ('effects' in n && Array.isArray(n.effects) && n.effects.length && !n.effectStyleId) {
            n.effects = n.effects.map(e => (e.type === 'DROP_SHADOW' && (e.color.a || 0) < 0.2) ? Object.assign({}, e, { color: Object.assign({}, e.color, { a: Math.min(0.6, (e.color.a || 0.1) * 3) }) }) : e);
          }
        } catch (e) { errors.push(d.name + ' › ' + (n.name || n.type) + ': ' + e.message); } }
        darkMade++;
      } catch (e) { errors.push(d.name + ': ' + e.message); }
    }
  } catch (e) { errors.push('Setup: ' + e.message); console.error(e); }
  return { setsDone, darkMade, errors };
}


async function tuneTabBar() {
  // The floating tab bar gets its own, stronger glass: blur 40 + denser tint (cards and buttons keep theirs).
  const fx = await figma.getLocalEffectStylesAsync();
  const make = (name, effects) => { let s = fx.find(x => x.name === name); if (!s) { s = figma.createEffectStyle(); s.name = name; } s.effects = effects; s.description = 'Floating bars (tab bar). Stronger than button glass so content behind turns to haze.'; return s.id; };
  const ds = (a, y, r) => ({ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a }, offset: { x: 0, y }, radius: r, spread: 0, visible: true, blendMode: 'NORMAL', showShadowBehindNode: false });
  const ins = (c, a, y, spread) => ({ type: 'INNER_SHADOW', color: { r: c, g: c, b: c, a }, offset: { x: 0, y }, radius: 0, spread: spread || 0, visible: true, blendMode: 'NORMAL' });
  const bb = { type: 'BACKGROUND_BLUR', radius: 40, visible: true };
  const LIGHT = make('Glass/Bar · Light', [bb, ins(1, 1, 1), ins(0, 0.07, 0, 0.5), ds(0.04, 1, 2), ds(0.10, 8, 24)]);
  const DARK = make('Glass/Bar · Dark', [bb, ins(1, 0.07, 1), ins(1, 0.06, 0, 0.5), ds(0.5, 8, 24)]);
  let n = 0;
  for (const p of figma.root.children) { await p.loadAsync(); for (const s of p.findAllWithCriteria({ types: ['COMPONENT_SET'] })) { if (s.name !== 'Tab bar') continue;
    for (const v of s.children) { const dark = /Mode=Dark/.test(v.name);
      v.fills = [dark ? { type: 'SOLID', color: { r: 0.118, g: 0.118, b: 0.125 }, opacity: 0.72 } : { type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 0.72 }];
      await v.setEffectStyleIdAsync(dark ? DARK : LIGHT); n++; } } }
  return n;
}
(async () => {
  let msg = '';
  try {
    figma.notify('Building components… this can take a minute.', { timeout: 60000 });
    let exists = false;
    for (const p of figma.root.children) { await p.loadAsync(); if (p.findAllWithCriteria({ types: ['COMPONENT_SET'] }).some(s => s.name === 'Button')) { exists = true; break; } }
    const a = exists ? { made: 0, errors: [], skipped: true } : await buildComponents();
    if (a.errors.some(e => e.startsWith('Setup:'))) {
      msg = 'Stopped before building: ' + a.errors.join(' | ');
    } else {
      const b = await addDarkMode();
      let tabs = 0; try { tabs = await tuneTabBar(); } catch (e) { b.errors.push('Tab bar glass: ' + e.message); }
      const errs = a.errors.concat(b.errors);
      msg = (a.skipped ? 'Components already there, so not rebuilt.' : `Done: ${a.made} component groups built.`) + ` Dark mode: ${b.setsDone} components set up, ${b.darkMade} dark variants finished (Dark is the default). Tab bar glass updated (${tabs}).` + (errs.length ? ' Problems: ' + errs.slice(0, 8).join(' | ') + (errs.length > 8 ? ' …' : '') : ' No problems.');
    }
  } catch (e) { msg = 'Error: ' + e.message; console.error(e); }
  figma.notify(msg, { timeout: 30000, error: /Problems|Error|Stopped/.test(msg) }); console.log(msg);
  setTimeout(() => figma.closePlugin(), 30500);
})();

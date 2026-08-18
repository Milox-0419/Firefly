// 文件: public/scripts/cursor-effect.js
class Particle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type || 'circle'; // 'circle' 或 'triangle'
        this.size = Math.random() * 6 + 2;
        this.speedX = (Math.random() - 0.5) * 2;
        this.speedY = (Math.random() - 0.5) * 2 - 1;
        this.life = 1.0;
        this.decay = 0.01 + Math.random() * 0.02;
        this.color = `hsl(${220 + Math.random() * 30}, 80%, 70%)`;
        // 三角形需要旋转角度
        this.rotation = Math.random() * Math.PI * 2;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
        this.size *= 0.99; // 缓慢缩小
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.translate(this.x, this.y);
        
        if (this.type === 'triangle') {
            ctx.rotate(this.rotation);
            ctx.beginPath();
            for (let i = 0; i < 3; i++) {
                const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
                const x = Math.cos(angle) * this.size;
                const y = Math.sin(angle) * this.size;
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fillStyle = this.color;
            ctx.fill();
        } else {
            // 圆形拖尾：绘制尖尾光效
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
            gradient.addColorStop(0, 'rgba(255,255,255,0.8)');
            gradient.addColorStop(0.3, this.color);
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

class CursorEffect {
    constructor() {
        this.particles = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.isMouseDown = false;
        this.init();
    }

    init() {
        // 创建 Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:9999;';
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // 事件监听
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            // 鼠标移动时生成拖尾粒子
            for (let i = 0; i < 2; i++) {
                this.particles.push(new Particle(
                    this.mouseX + (Math.random() - 0.5) * 10,
                    this.mouseY + (Math.random() - 0.5) * 10,
                    Math.random() > 0.7 ? 'triangle' : 'circle'
                ));
            }
        });

        document.addEventListener('mousedown', () => {
            this.isMouseDown = true;
            // 点击时生成圆圈粒子
            for (let i = 0; i < 40; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 5 + 2;
                const p = new Particle(this.mouseX, this.mouseY, 'circle');
                p.speedX = Math.cos(angle) * speed;
                p.speedY = Math.sin(angle) * speed;
                p.size = Math.random() * 8 + 3;
                p.color = `hsl(${200 + Math.random() * 40}, 90%, 70%)`;
                p.decay = 0.015 + Math.random() * 0.025;
                // 部分粒子变成三角形
                if (Math.random() > 0.6) p.type = 'triangle';
                this.particles.push(p);
            }
        });

        document.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });

        // 窗口大小变化自适应
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        });

        this.animate();
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 更新和绘制粒子
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update();
            p.draw(this.ctx);
            if (p.life <= 0 || p.size < 0.1) {
                this.particles.splice(i, 1);
            }
        }
        
        requestAnimationFrame(() => this.animate());
    }
}

// 页面加载后初始化
document.addEventListener('DOMContentLoaded', () => {
    new CursorEffect();
});
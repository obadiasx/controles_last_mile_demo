import { Route, Routes, Navigate } from "react-router";
import Conference from "./pages/Conference/Conference";
import Login from "./pages/Login/Login";
import UserList from "./pages/UserList/UserList";
import MenuRedirect from "./pages/MenuRedirect/MenuRedirect";
import DailyMission from "./pages/DailyMission/DailyMission";
import Ceagesp from "./pages/Ceagesp/Ceagesp";
import FornecedorFormaPagamento from "./pages/FornecedorFormaPagamento/FornecedorFormaPagamento";
import ProdutoTetoPreco from "./pages/ProdutoTetoPreco/ProdutoTetoPreco";
import RolesList from "./pages/Roles/RolesList";
import SyncPanel from "./pages/Sync/SyncPanel";
import Perfil from "./pages/Perfil/Perfil";
import AppLayout from "./components/Layout/AppLayout/AppLayout";
import PendenciasDia from "./pages/PendenciasDia/PendenciasDia";
import SmtpEnvioAdmin from "./pages/SmtpEnvio/SmtpEnvioAdmin";
import NotificacaoSidiPendencias from "./pages/NotificacaoSidiPendencias/NotificacaoSidiPendencias";

const AllRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/menuredirect" replace />} />
        <Route path="menuredirect" element={<MenuRedirect />} />
        <Route path="conference" element={<Conference />} />
        <Route path="dailymission" element={<DailyMission />} />
        <Route path="pedido-fornecedor" element={<DailyMission />} />
        <Route path="ceagesp" element={<Ceagesp />} />
        <Route
          path="fornecedores-forma-pagamento"
          element={<FornecedorFormaPagamento />}
        />
        <Route path="produtos-teto-preco" element={<ProdutoTetoPreco />} />
        <Route path="pendencias-dia" element={<PendenciasDia />} />
        <Route path="usuarios" element={<UserList />} />
        <Route path="roles" element={<RolesList />} />
        <Route path="sync" element={<SyncPanel />} />
        <Route path="smtp-envio" element={<SmtpEnvioAdmin />} />
        <Route path="pendencias-email-sidi" element={<NotificacaoSidiPendencias />} />
        <Route path="perfil" element={<Perfil />} />
      </Route>
      <Route path="/userlist" element={<Navigate to="/usuarios" replace />} />
      <Route path="*" element={<h1>404 Not Found</h1>} />
    </Routes>
  );
};

export default AllRoutes;
